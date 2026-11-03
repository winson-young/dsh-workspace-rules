/**
 * dsh-workspace-rules · host 端
 *
 * 只做一件事：读写 `<dir>/CLAUDE.local.md`。
 * 规则注入、优先级、生效时机全部由 @deepseek-ai/dsh-agent-instructions 负责，
 * 本插件永远不碰提示词。
 *
 * 这里的两条数据来源都是官方服务，不靠猜：
 * - `workspaceRegistry` 提供规范化的 Workspace 路径与经 header 校验的会话归属，
 *   所以「这份文件影响哪些会话」是权威答案，而不是从转义目录名反推。
 * - `sessionPersistence` 提供会话日志，所以「是否已加载」走存储契约读事件，
 *   而不是自己解 zstd 帧。
 */

import { promises as fs } from 'node:fs'
import { execFile } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

/**
 * 跑一条 git 命令，把回调式实现包成 Promise。
 *
 * 不用 `util.promisify(execFile)`：在 Node 22 上它会把参数里的 `--`
 * 当成 options 传下去（ERR_INVALID_ARG_TYPE），而 `--` 恰恰是路径分隔符，
 * 少了它用户目录名会被当成 pathspec 解析。
 * @param {string[]} args - 参数数组。
 * @param {object} options - execFile 选项。
 * @returns {Promise<{stdout: string, stderr: string}>} 命令输出。
 */
function runGit(args, options) {
  return new Promise((resolve, reject) => {
    execFile('git', args, options, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout
        error.stderr = stderr
        reject(error)
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

export const name = 'workspace-rules'

/** 本插件独占的唯一文件名，不可变成变量。 */
const RULES_FILE = 'CLAUDE.local.md'

/** 原生加载器会读取的全部文件名，按注入顺序排列。 */
const LOADER_CANDIDATES = ['AGENTS.md', 'CLAUDE.md', 'AGENTS.local.md', 'CLAUDE.local.md']

/** 加载链向上追溯的最大层数。 */
const MAX_CHAIN_DEPTH = 4

/** 编辑器一次最多读入的字节数。超过则拒绝，避免把巨型文件塞进浏览器。 */
const MAX_READ_BYTES = 4 * 1024 * 1024

/** 会话开头的多少条事件里会出现指令基线。基线实测位于 seq 7~11。 */
const BASELINE_READ_EVENTS = 40

/** 分块回扫时每块的事件条数。 */
const SCAN_CHUNK_EVENTS = 500

/**
 * 一次面板读取最多扫过的事件条数。
 *
 * JSONL 后端的 `stat()` 只给 sizeBytes，不提供 eventCount（已核对实现），
 * 所以无法直接跳到尾部，只能从头分块扫。这里给一个预算：中小会话能扫完，
 * 超大会话则停在预算处并被标记为「未扫完」——此时宁可说「未确认」，
 * 也不能把旧基线当成当前状态。
 */
const SCAN_MAX_EVENTS = 4000

const API_BASE = '/api/workspace-rules'

// ---------------------------------------------------------------------------
// 基础工具
// ---------------------------------------------------------------------------

/**
 * 取异常的可读消息。
 * @param {unknown} error - 抛出的值。
 * @returns {string} 消息文本。
 */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * 取异常上的 `code` 字段，不做类型断言。
 * @param {unknown} error - 抛出的值。
 * @returns {string | undefined} 存在时返回 code。
 */
function codeOf(error) {
  if (error instanceof Error && 'code' in error) {
    const code = error.code
    if (typeof code === 'string') return code
  }
  return undefined
}

/**
 * 判断是否为固定位置的绝对路径。
 *
 * `C:foo` 在 win32 上也算 absolute，但它是盘符相对路径，含义随当前目录变化，
 * 不能作为文件定位依据。
 * @param {string} candidate - 待测路径。
 * @returns {boolean} 是否固定。
 */
function isFixedPath(candidate) {
  if (!path.isAbsolute(candidate)) return false
  return !/^[a-zA-Z]:(?![\\/])/.test(candidate)
}

/**
 * 按本平台的大小写规则比较两条路径。
 * @param {string} a - 第一条。
 * @param {string} b - 第二条。
 * @returns {boolean} 是否指向同一位置。
 */
function samePath(a, b) {
  const left = path.resolve(a)
  const right = path.resolve(b)
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right
}

/**
 * 判断 `child` 是 `parent` 本身还是位于其下。
 * @param {string} child - 候选后代。
 * @param {string} parent - 候选祖先。
 * @returns {boolean} 是否包含。
 */
function isWithin(child, parent) {
  const relative = path.relative(path.resolve(parent), path.resolve(child))
  if (relative === '') return true
  return !relative.startsWith('..') && !path.isAbsolute(relative)
}

/**
 * 解析 DSH 主目录。
 * @returns {string} 绝对路径。
 */
function dshHome() {
  const configured = process.env.DSH_HOME
  if (typeof configured === 'string' && configured.length > 0) return path.resolve(configured)
  return path.join(os.homedir(), '.dsh')
}

/**
 * 构造 JSON 响应。所有读接口都必须 no-store，否则浏览器会缓存住旧内容。
 * @param {number} status - 状态码。
 * @param {unknown} body - 可序列化载荷。
 * @returns {Response} 响应对象。
 */
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

/**
 * 带状态码的错误，供路由层统一转成响应。
 * @param {string} message - 消息。
 * @param {number} status - 状态码。
 * @returns {Error} 带 status 字段的错误。
 */
function httpError(message, status) {
  const error = new Error(message)
  Object.defineProperty(error, 'status', { value: status, enumerable: false })
  return error
}

/**
 * 从错误上读状态码。
 * @param {unknown} error - 抛出的值。
 * @returns {number} HTTP 状态码。
 */
function statusOf(error) {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = Number(error.status)
    if (Number.isFinite(status) && status >= 400 && status <= 599) return status
  }
  return 500
}

/**
 * 探测文本的换行风格。混合时报告多数派并把 mixed 置真。
 * @param {string} text - 已剥离 BOM 的文本。
 * @returns {{ eol: 'lf' | 'crlf', mixed: boolean }} 探测结果。
 */
function detectEol(text) {
  const crlf = (text.match(/\r\n/g) ?? []).length
  const lf = (text.match(/(?<!\r)\n/g) ?? []).length
  if (crlf === 0 && lf === 0) return { eol: 'lf', mixed: false }
  if (crlf > 0 && lf > 0) return { eol: crlf >= lf ? 'crlf' : 'lf', mixed: true }
  return { eol: crlf > 0 ? 'crlf' : 'lf', mixed: false }
}

/**
 * 计算原生加载器为某个文件记录的摘要。
 *
 * 已用三个真实会话验证：sha1 覆盖「剥离 UTF-8 BOM 后的原始字节」，
 * 保留原始换行与行尾空白。这个口径必须唯一，否则「已加载」判定会永远对不上。
 * @param {Buffer} bytes - 原始字节。
 * @returns {string} 40 位十六进制摘要。
 */
function contentDigest(bytes) {
  const body = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
    ? bytes.subarray(3)
    : bytes
  return crypto.createHash('sha1').update(body).digest('hex')
}

// ---------------------------------------------------------------------------
// git 泄露防护
// ---------------------------------------------------------------------------

/**
 * 解析 `.git` 文件里的 `gitdir:` 指针。
 * @param {string} gitFile - worktree 或 submodule 的 `.git` 文件。
 * @returns {Promise<string | null>} 解析出的 git 目录，读不出来则为 null。
 */
async function readGitDirPointer(gitFile) {
  try {
    const text = await fs.readFile(gitFile, 'utf8')
    const match = /^gitdir:\s*(.+)$/m.exec(text)
    if (!match) return null
    const target = match[1].trim()
    return path.isAbsolute(target) ? target : path.resolve(path.dirname(gitFile), target)
  } catch {
    return null
  }
}

/**
 * 定位某个目录对应的 `info/exclude`。
 *
 * 覆盖三种真实布局：普通仓库（`.git` 是目录）、worktree / submodule
 * （`.git` 是文件，指向真正的 git 目录）、以及 commondir 重定向的链接目录。
 * 直接拼 `.git/info/exclude` 会在后两种情况下静默写到不存在的位置。
 * @param {string} dir - 待检查目录。
 * @returns {Promise<{ kind: 'none' | 'repository' | 'linked', excludePath: string | null }>} 布局。
 */
async function locateExclude(dir) {
  const marker = path.join(dir, '.git')
  let stat
  try {
    stat = await fs.stat(marker)
  } catch {
    return { kind: 'none', excludePath: null }
  }

  let gitDir = marker
  let kind = 'repository'
  if (stat.isFile()) {
    kind = 'linked'
    const pointer = await readGitDirPointer(marker)
    if (!pointer) return { kind, excludePath: null }
    gitDir = pointer
  }

  let common = gitDir
  try {
    const commondir = (await fs.readFile(path.join(gitDir, 'commondir'), 'utf8')).trim()
    if (commondir.length > 0) {
      common = path.isAbsolute(commondir) ? commondir : path.resolve(gitDir, commondir)
    }
  } catch {
    // 没有 commondir：普通仓库或自包含的链接目录。
  }

  return { kind, excludePath: path.join(common, 'info', 'exclude') }
}

/**
 * 需要被忽略的模式。
 *
 * 第二项是原子写入用的临时文件：它虽只存在几毫秒，但名字不以
 * `CLAUDE.local.md` 开头就不会被精确匹配覆盖，一旦进程崩溃残留下来，
 * 就会把规则内容原样暴露给 `git status`。
 */
const EXCLUDE_PATTERNS = [RULES_FILE, `.${RULES_FILE}.tmp-*`]

/** 我们在 exclude 里写入的说明行，用来判断注释是否已经写过。 */
const EXCLUDE_HEADER = '# 由 dsh-workspace-rules 写入：本机私有规则，禁止提交'

/**
 * 判断 exclude 文件是否已经覆盖规则文件名。
 * @param {string} excludePath - exclude 文件位置。
 * @returns {Promise<boolean>} 是否已覆盖。
 */
async function excludeCovers(excludePath) {
  let text
  try {
    text = await fs.readFile(excludePath, 'utf8')
  } catch {
    return false
  }
  const lines = text
    .split(/\r?\n/)
    .map((rawLine) => rawLine.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => line.replace(/^\/+/, '').replace(/\/+$/, ''))

  const covered = (pattern) => lines.some((line) => {
    if (line === pattern) return true
    if (line === '*' || line === '**') return true
    // 通配模式按最小范围判断：只认能匹配上目标名的写法。
    if (line === `**/${pattern}` || line === `*${pattern}`) return true
    return false
  })

  return EXCLUDE_PATTERNS.every(covered)
}

/**
 * 在 exclude 缺失时追加规则文件名。
 *
 * 只追加：不重排、不改写已有行；原文件末尾没有换行时先补一个，
 * 否则会把自己的规则粘到最后一行上，变成一个不生效的模式。
 * 注释头只写一次——已经写过就不再重复，避免多次保存后堆出一串重复说明。
 * @param {string} excludePath - exclude 文件位置。
 * @returns {Promise<'added' | 'present' | 'failed'>} 结果。
 */
async function ensureExcluded(excludePath) {
  if (await excludeCovers(excludePath)) return 'present'
  try {
    await fs.mkdir(path.dirname(excludePath), { recursive: true })
    let current = ''
    try {
      current = await fs.readFile(excludePath, 'utf8')
    } catch {
      // 文件不存在：直接创建。
    }
    const prefix = current.length > 0 && !current.endsWith('\n') ? '\n' : ''
    const present = new Set(
      current
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#')),
    )
    const missing = EXCLUDE_PATTERNS.filter((pattern) => !present.has(pattern))
    if (missing.length === 0) return 'present'

    const header = current.includes(EXCLUDE_HEADER) ? '' : `${EXCLUDE_HEADER}\n`
    await fs.appendFile(excludePath, `${prefix}${header}${missing.join('\n')}\n`, 'utf8')
    return 'added'
  } catch {
    return 'failed'
  }
}

/**
 * 判断规则文件是否已被 git 追踪。
 *
 * 这一条比 exclude 更靠前：文件一旦进了版本库，exclude 对它毫无作用，
 * 后续每次提交都会带上它。所以「已追踪」必须在写入前就拦住。
 *
 * 返回三态而不是布尔：git 不存在、目录不是仓库、命令超时都属于「不知道」，
 * 不能当成「安全」。拿不准时让面板显示未知，而不是给用户一个假的安心。
 * @param {string} dir - 规则文件所在目录。
 * @returns {Promise<boolean|null>} 已追踪为 true，未追踪为 false，无从判断为 null。
 */
async function isTracked(dir) {
  try {
    await runGit(['ls-files', '--error-unmatch', '--', RULES_FILE], {
      cwd: dir,
      windowsHide: true,
      timeout: 5000,
    })
    return true
  } catch (error) {
    // execFile 的 code 是数字退出码，不能走 codeOf（它只认字符串 code）。
    const exitCode = error instanceof Error && 'code' in error ? error.code : undefined
    // 退出码 1 且没有任何输出 = 这个路径不在索引里，是干净的。
    if (exitCode === 1 && !String(error.stdout || '').trim()) return false
    return null
  }
}

/**
 * 报告某个目录的泄露防护状态。只依赖文件系统能确定的事实。
 * @param {string} dir - 规则文件所在目录。
 * @returns {Promise<object>} 可供面板展示的 git 状态。
 */
async function gitPosture(dir) {
  const { kind, excludePath } = await locateExclude(dir)
  if (kind === 'none') return { kind: 'none', excludePath: null, excluded: null, tracked: null }
  if (!excludePath) {
    return { kind, excludePath: null, excluded: null, tracked: await isTracked(dir) }
  }
  return {
    kind,
    excludePath,
    excluded: await excludeCovers(excludePath),
    tracked: await isTracked(dir),
  }
}

// ---------------------------------------------------------------------------
// 指令文件勘察
// ---------------------------------------------------------------------------

/**
 * 只取 stat 元数据，绝不读内容。
 *
 * 面板不允许收到同目录其他规则文件的正文——那会越过「只写自己那个文件」的边界。
 * @param {string} dir - 目录。
 * @param {string} file - 文件名。
 * @returns {Promise<object>} 存在性与元数据。
 */
async function statInstruction(dir, file) {
  const target = path.join(dir, file)
  try {
    const stat = await fs.stat(target)
    if (!stat.isFile()) return { name: file, exists: false }
    return { name: file, exists: true, sizeBytes: stat.size, mtimeMs: stat.mtimeMs }
  } catch {
    return { name: file, exists: false }
  }
}

/**
 * 从 `dir` 向上到 `root` 逐层勘察指令文件。
 *
 * 原生加载器会注入「项目根 → 会话 cwd」链上每一层的文件，所以面板目标目录
 * 之外的一层仍会影响嵌套目录里开启的会话。不报告这条链，用户就无法解释
 * 「为什么加载了两份规则」。
 * @param {string} dir - 起始目录。
 * @param {string} root - 工作区根；未注册时用起始目录自身作为边界。
 * @returns {Promise<Array<object>>} 由近及远的勘察结果，只含有文件的层。
 */
async function instructionChain(dir, root) {
  const levels = []
  let current = path.resolve(dir)
  const boundary = isWithin(current, root) ? path.resolve(root) : current
  for (let depth = 0; depth < MAX_CHAIN_DEPTH; depth += 1) {
    const files = await Promise.all(LOADER_CANDIDATES.map((file) => statInstruction(current, file)))
    const present = files.filter((entry) => entry.exists)
    if (present.length > 0) levels.push({ dir: current, files: present })
    if (samePath(current, boundary)) break
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return levels
}

// ---------------------------------------------------------------------------
// 会话观测
// ---------------------------------------------------------------------------

/**
 * 找到拥有该目录的 Workspace。
 *
 * Workspace 成员关系由 registry 按规范 cwd 做过 header 校验，且新会话排在最前，
 * 所以这里既不需要扫目录名，也不需要全量遍历会话。
 * @param {object} registry - `ctx.workspaceRegistry`。
 * @param {string} dir - 目标目录。
 * @returns {object | null} 拥有它的 workspace，未注册则为 null。
 */
function owningWorkspace(registry, dir) {
  const workspaces = registry.list()
  const exact = workspaces.find((workspace) => samePath(workspace.path, dir))
  if (exact) return exact
  const ancestors = workspaces
    .filter((workspace) => isWithin(dir, workspace.path))
    .sort((a, b) => b.path.length - a.path.length)
  return ancestors[0] ?? null
}

/**
 * 把一条 `agent-instructions` 事件的 changes 归一成可比较的形状。
 * @param {object} source - 事件的 `data.source`。
 * @returns {Array<object>} 归一后的变更项。
 */
function normalizeChanges(source) {
  if (!Array.isArray(source?.changes)) return []
  return source.changes.map((change) => ({
    action: typeof change.action === 'string' ? change.action : 'set',
    scope: typeof change.scope === 'string' ? change.scope : '',
    path: typeof change.path === 'string' ? change.path : '',
    digest: typeof change.digest === 'string' ? change.digest : '',
  }))
}

/**
 * 从一批事件里挑出最后一条指令事件。
 * @param {Array<object>} events - 事件序列。
 * @returns {object | null} 最后一条指令事件的 `source`。
 */
function lastInstructionSource(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type !== 'user/message') continue
    const source = event.data?.source
    if (source && source.kind === 'agent-instructions') return source
  }
  return null
}

/**
 * 读出一个会话当前的指令装载状态。
 *
 * 不能只看 baseline：加载器在运行期间会推送增量（实测：文件在会话中途出现时，
 * 会话里追加了一条带 changes 的 `agent-instructions` 事件）。只看 baseline 会把
 * 「已经热加载过」错报成「没加载」，所以这里把 baseline 与尾部增量合并。
 * @param {object} persistence - `ctx.sessionPersistence`。
 * @param {string} sessionId - 会话 id。
 * @returns {Promise<object | null>} 合并后的装载状态，读不到则为 null。
 */
async function readInstructions(persistence, sessionId) {
  let handle
  try {
    handle = await persistence.open(sessionId, 'read')
    const header = handle.header

    const head = await handle.read(0, BASELINE_READ_EVENTS)
    const headSource = lastInstructionSource(head.events)
    if (!headSource) return null

    let parsed = null
    if (typeof headSource.baselineIdentity === 'string') {
      try {
        parsed = JSON.parse(headSource.baselineIdentity)
      } catch {
        parsed = null
      }
    }

    // 合并 baseline 与后续增量；同一个 scope 以出现更晚的为准。
    const merged = new Map()
    for (const change of normalizeChanges(headSource)) {
      if (change.scope) merged.set(change.scope, change)
    }

    // 分块回扫：JSONL 后端不给 eventCount，只能正序读到预算或读完为止。
    let offset = BASELINE_READ_EVENTS
    let scanned = 0
    let complete = false
    while (scanned < SCAN_MAX_EVENTS) {
      const { events } = await handle.read(offset, SCAN_CHUNK_EVENTS)
      if (events.length === 0) {
        complete = true
        break
      }
      for (const event of events) {
        if (event?.type !== 'user/message') continue
        const source = event.data?.source
        if (!source || source.kind !== 'agent-instructions') continue
        for (const change of normalizeChanges(source)) {
          if (!change.scope) continue
          if (change.action === 'remove') merged.delete(change.scope)
          else merged.set(change.scope, change)
        }
      }
      offset += events.length
      scanned += events.length
      if (events.length < SCAN_CHUNK_EVENTS) {
        complete = true
        break
      }
    }

    return {
      cwd: typeof header?.cwd === 'string' ? header.cwd : null,
      projectRoot: typeof parsed?.projectRoot === 'string' ? parsed.projectRoot : null,
      maxBytes: typeof parsed?.maxBytes === 'number' ? parsed.maxBytes : null,
      // 没扫完就不知道后面还有没有更新的指令事件，此时调用方必须降级为「未确认」。
      complete,
      changes: Array.from(merged.values()),
    }
  } catch {
    return null
  } finally {
    if (handle) {
      try {
        await handle.close()
      } catch {
        // 关闭失败不得覆盖读取结果。
      }
    }
  }
}

/**
 * 把磁盘上的规则文件与最近一个会话装载的副本做比对。
 *
 * 它能回答的问题比「是否生效」窄得多：**最近那个会话装载的是不是这套字节**。
 * 这是 UI 唯一被允许做出的断言。
 * @param {object} options - 观测输入。
 * @returns {Promise<object>} 面板状态载荷。
 */
async function loadStatus({ registry, persistence, dir, onDiskDigest }) {
  if (!registry || !persistence) {
    return { checked: false, reason: 'services-unavailable', session: null }
  }

  const workspace = owningWorkspace(registry, dir)
  if (!workspace) return { checked: false, reason: 'no-workspace', session: null }

  const scope = { workspace: { path: workspace.path, title: workspace.title } }
  const newest = workspace.sessionIds?.[0]
  if (!newest) return { checked: false, reason: 'no-session', ...scope }

  const state = await readInstructions(persistence, newest)
  if (!state) return { checked: false, reason: 'not-baselined', ...scope }

  // scope 形如 `<相对项目根的路径>\0<文件名>`。这里只按文件名尾部匹配，
  // 因为 projectRoot 是相对 cwd 的表达，拼接时容易算偏；文件名是唯一确定的。
  const match = state.changes.find((change) => change.scope.endsWith(`\u0000${RULES_FILE}`)) ?? null

  return {
    checked: true,
    reason: match ? 'observed' : 'not-listed',
    ...scope,
    session: {
      id: String(newest),
      cwd: state.cwd,
      instructionCount: state.changes.length,
      loadedDigest: match ? match.digest : null,
      loadedPath: match ? match.path : null,
      // 只有扫描完整时，digest 比对才有意义；否则它只是「目前看到的最后一份」。
      matchesDisk: state.complete && match && onDiskDigest ? match.digest === onDiskDigest : null,
      complete: state.complete,
    },
  }
}

// ---------------------------------------------------------------------------
// 读写
// ---------------------------------------------------------------------------

/**
 * 读取某个目录的规则文件，并附带周边事实。
 * @param {string} dir - 已校验的绝对目录。
 * @param {object} deps - 宿主服务。
 * @returns {Promise<object>} 面板载荷。
 */
async function readRules(dir, deps) {
  const target = path.join(dir, RULES_FILE)
  let exists = false
  let content = ''
  let mtimeMs = null
  let sizeBytes = 0
  let eol = 'lf'
  let mixedEol = false
  let bom = false
  let truncated = false
  let digest = null

  try {
    const stat = await fs.stat(target)
    if (stat.isFile()) {
      exists = true
      mtimeMs = stat.mtimeMs
      sizeBytes = stat.size
      const bytes = await fs.readFile(target)
      digest = contentDigest(bytes)
      bom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
      const text = bytes.toString('utf8').replace(/^\uFEFF/, '')
      if (bytes.length > MAX_READ_BYTES) {
        content = text.slice(0, MAX_READ_BYTES)
        truncated = true
      } else {
        content = text
      }
      const detected = detectEol(content)
      eol = detected.eol
      mixedEol = detected.mixed
    }
  } catch (error) {
    if (codeOf(error) !== 'ENOENT') throw error
  }

  const workspace = deps.registry ? owningWorkspace(deps.registry, dir) : null
  const [chain, git, status] = await Promise.all([
    instructionChain(dir, workspace ? workspace.path : dir),
    gitPosture(dir),
    loadStatus({ registry: deps.registry, persistence: deps.persistence, dir, onDiskDigest: digest }),
  ])

  return {
    dir,
    path: target,
    exists,
    content,
    mtimeMs,
    sizeBytes,
    eol,
    mixedEol,
    bom,
    truncated,
    digest,
    loaderLimitBytes: 65536,
    overLimit: sizeBytes > 65536,
    chain,
    git,
    status,
  }
}

/**
 * 覆盖前备份旧内容。
 *
 * 备份绝不落在项目目录里：多出一个 `.bak` 会让精确匹配的 exclude 规则失效，
 * 反而泄露了它本想保护的内容。
 * @param {string} dir - 规则文件所在目录。
 * @param {Buffer} previous - 即将被替换的字节。
 * @returns {Promise<string | null>} 备份路径；未写入则为 null。
 */
async function backupPrevious(dir, previous) {
  const bucket = contentDigest(Buffer.from(path.resolve(dir).toLowerCase())).slice(0, 16)
  const folder = path.join(dshHome(), 'backups', 'workspace-rules', bucket)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const target = path.join(folder, `${stamp}.md`)
  try {
    await fs.mkdir(folder, { recursive: true })
    await fs.writeFile(target, previous)
    return target
  } catch {
    return null
  }
}

/**
 * 经同目录临时文件 + rename 写入。
 *
 * 直接覆盖在断电或并发写入时会留下半截文件；而 Windows 上 rename 偶发
 * EPERM/EBUSY（杀毒软件或索引服务持有句柄），所以先重试，最后才降级直写。
 * @param {string} target - 目标路径。
 * @param {Buffer} bytes - 内容。
 * @returns {Promise<{ atomic: boolean }>} 是否走了原子路径。
 */
async function writeAtomic(target, bytes) {
  const temporary = path.join(
    path.dirname(target),
    `.${RULES_FILE}.tmp-${crypto.randomBytes(6).toString('hex')}`,
  )
  try {
    await fs.writeFile(temporary, bytes, { mode: 0o600 })
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await fs.rename(temporary, target)
        return { atomic: true }
      } catch (error) {
        const code = codeOf(error)
        if (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES') throw error
        await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)))
      }
    }
  } catch {
    // 落到直写分支。
  }
  try {
    await fs.unlink(temporary)
  } catch {
    // 尽力清理：残留临时文件比保存失败更可接受。
  }
  await fs.writeFile(target, bytes, { mode: 0o600 })
  return { atomic: false }
}

/**
 * 保存规则文件，并在文件已被他人改动时拒绝写入。
 * @param {object} request - 已解析的请求体。
 * @param {object} deps - 宿主服务。
 * @returns {Promise<Response>} HTTP 响应。
 */
async function writeRules(request, deps) {
  const { dir, content, baseMtimeMs } = request
  if (typeof content !== 'string') return json(400, { error: 'content 必须是字符串' })

  const bytes = Buffer.from(content, 'utf8')
  if (bytes.length > MAX_READ_BYTES) return json(413, { error: '内容过大' })

  const target = path.join(dir, RULES_FILE)
  let currentMtimeMs = null
  let previous = null
  try {
    const stat = await fs.stat(target)
    if (stat.isFile()) {
      currentMtimeMs = stat.mtimeMs
      previous = await fs.readFile(target)
    }
  } catch (error) {
    if (codeOf(error) !== 'ENOENT') return json(500, { error: messageOf(error) })
  }

  // 乐观锁：文件在读取之后出现、消失或改动，都是冲突，绝不静默覆盖。
  const hadFile = currentMtimeMs !== null
  if (hadFile && baseMtimeMs === null) {
    return json(409, { error: 'conflict', reason: 'appeared', currentMtimeMs, path: target })
  }
  if (hadFile && Math.abs(baseMtimeMs - currentMtimeMs) > 0.5) {
    return json(409, { error: 'conflict', reason: 'changed', currentMtimeMs, path: target })
  }
  if (!hadFile && baseMtimeMs !== null) {
    return json(409, { error: 'conflict', reason: 'removed', currentMtimeMs: null, path: target })
  }

  // 先建立忽略规则再落内容：宁可这次存不进去，也不留一个「已存在但没被排除」的空窗。
  const posture = await gitPosture(dir)

  // 已被索引追踪的文件，ignore 规则对它完全无效，下次提交照样带上。
  // 这里必须硬拒绝：写进去之后再说「请注意」已经晚了，内容已在本机规则里。
  if (posture.tracked === true) {
    return json(409, {
      error: 'tracked',
      path: target,
      excludePath: posture.excludePath,
      message: `${RULES_FILE} 已在版本库索引中，忽略规则对它无效。请先执行 git rm --cached ${RULES_FILE}，再保存。`,
    })
  }

  let excludeOutcome = 'none'
  if (posture.excludePath) {
    excludeOutcome = await ensureExcluded(posture.excludePath)
    if (excludeOutcome === 'failed') {
      return json(409, {
        error: 'exclude-failed',
        path: target,
        excludePath: posture.excludePath,
        message: '无法写入 .git/info/exclude，已取消保存，避免留下一份未被忽略的本机规则',
      })
    }
  }

  const backupPath = previous ? await backupPrevious(dir, previous) : null

  let atomic = false
  try {
    const outcome = await writeAtomic(target, bytes)
    atomic = outcome.atomic
  } catch (error) {
    return json(500, { error: messageOf(error) })
  }

  const stat = await fs.stat(target)
  return json(200, {
    ok: true,
    path: target,
    mtimeMs: stat.mtimeMs,
    sizeBytes: stat.size,
    atomic,
    backupPath,
    exclude: { outcome: excludeOutcome, path: posture.excludePath },
    git: await gitPosture(dir),
  })
}

// ---------------------------------------------------------------------------
// 路由
// ---------------------------------------------------------------------------

/**
 * 校验 `dir` 参数为绝对且存在的目录。
 * @param {unknown} raw - 未信任输入。
 * @returns {Promise<string>} 规范化绝对路径。
 */
async function resolveDir(raw) {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw httpError('dir 必须是非空的绝对路径', 400)
  }
  const trimmed = raw.trim()
  if (!isFixedPath(trimmed)) throw httpError('dir 必须是绝对路径', 400)

  const resolved = path.resolve(trimmed)
  let stat
  try {
    stat = await fs.stat(resolved)
  } catch (error) {
    if (codeOf(error) === 'ENOENT') throw httpError('目录不存在', 400)
    throw error
  }
  if (!stat.isDirectory()) throw httpError('dir 不是目录', 400)

  // realpath 让符号链接与 `..` 拼法归一到同一个文件。
  try {
    return await fs.realpath(resolved)
  } catch {
    return resolved
  }
}

/**
 * 注册本插件拥有的三个端点。
 * @param {object} ctx - 宿主上下文（已注入 connection）。
 * @param {(p: string, m: string[], h: (r: Request) => Promise<Response>) => void} register - 路由注册器。
 */
function routes(ctx, register) {
  const depsOf = () => ({
    registry: ctx.get('workspaceRegistry'),
    persistence: ctx.get('sessionPersistence'),
  })

  register(`${API_BASE}/workspaces`, ['GET'], async () => {
    const registry = ctx.get('workspaceRegistry')
    if (!registry) return json(200, { available: false, workspaces: [] })
    const workspaces = registry.list().map((workspace) => ({
      id: String(workspace.id),
      path: workspace.path,
      title: workspace.title,
      sessionCount: Array.isArray(workspace.sessionIds) ? workspace.sessionIds.length : 0,
      updatedAt: workspace.updatedAt,
    }))
    return json(200, { available: true, workspaces })
  })

  // 一条路径只能注册一次：web server 对重复的 (kind, path) 抛错，
  // 于是 GET / POST 必须合并成一次注册，在 handler 里按 method 分派。
  register(API_BASE, ['GET', 'POST'], async (request) => {
    try {
      if (request.method === 'POST') {
        let body
        try {
          body = await request.json()
        } catch {
          return json(400, { error: '请求体必须是 JSON' })
        }
        if (typeof body !== 'object' || body === null) return json(400, { error: '请求体必须是对象' })
        const dir = await resolveDir(body.dir)
        const baseMtimeMs = typeof body.baseMtimeMs === 'number' ? body.baseMtimeMs : null
        return await writeRules({ dir, content: body.content, baseMtimeMs }, depsOf())
      }
      const url = new URL(request.url)
      const dir = await resolveDir(url.searchParams.get('dir'))
      return json(200, await readRules(dir, depsOf()))
    } catch (error) {
      return json(statusOf(error), { error: messageOf(error) })
    }
  })
}

/**
 * 插件入口。缺 connection 时不激活，因此 headless 之类没有该服务的
 * profile 里本插件会安静地什么也不做。
 * @param {object} ctx - 宿主上下文。
 */
export function apply(ctx) {
  ctx.inject(['connection'], (scoped) => {
    /**
     * 注册一条路由，并把它绑定到当前 fiber 的生命周期。
     * @param {string} routePath - API 路径。
     * @param {string[]} methods - 允许的方法。
     * @param {(request: Request) => Promise<Response>} handler - 处理函数。
     */
    const register = (routePath, methods, handler) => {
      scoped.effect(
        () => scoped.connection.fetch.register({
          path: routePath,
          methods,
          requestBody: 'buffered',
          fetch: handler,
        }),
        `workspace-rules: ${methods.join(',')} ${routePath}`,
      )
    }
    routes(scoped, register)
  })
}
