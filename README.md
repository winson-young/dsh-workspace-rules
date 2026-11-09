<div align="center">

<img src="https://raw.githubusercontent.com/winson-young/dsh-workspace-rules/main/icon.svg" width="88" height="88" alt="dsh-workspace-rules">

# dsh-workspace-rules

**每个项目一份私有约定，新会话自动载入。**

简体中文 | [English](README.en.md)

[![npm version](https://img.shields.io/npm/v/dsh-workspace-rules?style=flat-square&label=npm&color=cb3837)](https://www.npmjs.com/package/dsh-workspace-rules)
[![npm downloads](https://img.shields.io/npm/dm/dsh-workspace-rules?style=flat-square&label=downloads%2Fmonth&color=1F883D)](https://www.npmjs.com/package/dsh-workspace-rules)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.1--rc.5-6366f1?style=flat-square)](#兼容性)
[![node](https://img.shields.io/badge/node-%3E%3D20-339933?style=flat-square)](#兼容性)
[![dependencies](https://img.shields.io/badge/runtime%20deps-0-brightgreen?style=flat-square)](#兼容性)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

</div>

[快速认识](#快速认识本插件) · [亮点](#亮点) · [安装](#安装) · [使用](#使用) · [它怎么工作](#它怎么工作) · [重要限制](#重要限制) · [兼容性](#兼容性) · [更新日志](CHANGELOG.md)

---

「不要写无意义的强制类型转换」「SQL 都收敛进 model 层」——这类话每个项目都要重复说一遍。

这个插件把它们变成**项目里的一份文件**，新会话自动载入；同时给你一个设置面板，不用每次开编辑器。

## 快速认识本插件

一句话：**给项目写一份只属于它的约定，DSH 每次开会话都自动读到。**

```
你写 →  项目/CLAUDE.local.md  →  DSH 自动注入  →  模型照着做
```

具体到你手上的三件事：

| 你想做的事 | 怎么做 |
|---|---|
| 让 DSH 在这个项目里记住「SQL 收敛进 model 层」 | **设置 → 工作区规则** → 选项目 → 填一条 → 保存。以后这个项目每次新会话都带着它 |
| 这句话只想留在自己电脑上 | 保持「**同步到项目**」关闭（默认）。文件写 `CLAUDE.local.md`，同时自动加进 `.git/info/exclude`，同事看不到任何痕迹 |
| 这句话想让团队都遵守 | 打开「**同步到项目**」。文件写 `CLAUDE.md`，跟着仓库提交，谁拉代码谁生效 |

还有一条省事的：会话里聊着聊着发现了值得沉淀的一句话，让模型「记到项目规则里」，它会提交到面板的**待确认区**——**默认不写入**，你点「加入」才生效。

**不适合的场景**：跨项目的个人习惯（那该用全局 `~/.dsh/AGENTS.md`）、需要工具强制的规范（该用 lint / CI，模型只是照着做，不是保证）。

## 亮点

| | |
|---|---|
| **注入不归它管** | 规则由 DSH 内置的 `dsh-agent-instructions` 原生加载 `<项目>/CLAUDE.local.md`。插件只负责读写这个文件，**它坏了，规则照样生效** |
| **按工作区隔离** | A 项目的约定不会出现在 B 项目里。文件就在项目目录下，天然隔离 |
| **不污染同事** | `CLAUDE.local.md` 是「本地私有」约定，配合 `.git/info/exclude` 完全不进版本库，同事的 Cursor / Codex / [CC] 看不到任何痕迹 |
| **git 泄露防护** | 保存前自动补 `.git/info/exclude`；文件已被索引追踪时直接拒绝并提示 `git rm --cached`。兼容子模块与 worktree |
| **加载状态判据** | 面板会告诉你「这个会话读到的规则是不是磁盘上这份」，用的是会话里真实的 `digest` 比对，不是猜的 |
| **一条一行填空** | 不用手写 Markdown。每条规则一个输入框，回车接着写下一条，↑↓ 调顺序，× 删除；文件开头的标题和结尾的段落原样保留 |
| **本机私有 / 团队共享** | 一个开关切换：关闭写 `CLAUDE.local.md` 并自动进 `exclude`（同事无感）；打开写 `CLAUDE.md`（进版本库，团队共享） |
| **待确认区** | 会话里发现的候选规则先落到面板，**默认不写入文件**。你点「加入」它才进编辑器，再点保存才落盘 |
| **零依赖、零构建** | 源码即产物。没有打包步骤，没有 `node_modules`，装完就能用 |

## 安装

```bash
dsh plugin --profile web add dsh-workspace-rules
```

`web` 换成你想装进去的 profile 名。装完重启 DSH 进程，设置页多出「工作区规则」一节。

> 每个 profile 是独立环境。桌面版由 Electron 独占管理，CLI 装不进 `desktop` profile。

从 GitHub 源码安装（拿到的是最新提交，可能比 npm 上的新）：

```bash
dsh plugin --profile web add github:winson-young/dsh-workspace-rules
```

开发期挂本地源码：

```bash
dsh plugin --profile web add link:D:/Projects/dsh-workspace-rules
```

用 `link:` 而不是 `file:` —— `file:` 是**复制**，之后改代码完全不生效，且没有任何提示。

## 使用

1. 打开 **设置 → 工作区规则**
2. 选择或填写工作区目录
3. 决定这份约定给谁看：「同步到项目」关 = 只在本机（默认），开 = 进版本库
4. 一条一条填规则
5. 保存

每条规则占一个输入框。在任意一条上按 <kbd>Enter</kbd> 会在它下面新开一条并聚焦；左边 `↑` `↓` 调顺序，`×` 删除。空条目保存时会被丢掉，所以「先加一条、待会儿再填」不会在文件里留下空的 `- `。

不需要懂 Markdown，写出来是：

```markdown
# 编码约定

- 不要写无意义的强制类型转换
- 所有 SQL 收敛进 model 层，不要在 service / handler 里拼 SQL
- 改动前先确认现有实现，别重复造轮子
```

文件本身还是普通 Markdown，手改也不会坏。两条例外：

- **标题、说明段落、代码块**不在条目编辑器里显示，保存时逐字节原样保留。要改它们，点标题右侧的「直接编辑 Markdown」切到文本编辑。
- 文件结构比「扁平列表」复杂时（嵌套列表、条目之间的 `##` 分组、缩进续行），面板会**自动切到文本编辑并说明原因**，而不是猜着改写你的文件。这种情况下条目编辑器不可用。

### 只在本机 / 同步给团队

| | 关闭「同步到项目」（默认） | 打开「同步到项目」 |
|---|---|---|
| 写入文件 | `CLAUDE.local.md` | `CLAUDE.md` |
| `.git/info/exclude` | 自动追加，文件不进版本库 | 不动 |
| 同事能看到 | 不能 | 能，跟着仓库走 |
| 文件已被索引追踪 | **拒绝保存**，提示先 `git rm --cached` | 正常，本来就该被追踪 |

两个方向各有各的坑，面板会按当前模式给对应警告：本机模式怕「没被忽略」，同步模式怕「被忽略了所以提交不上去」。

同一目录里两份文件都存在时，加载器会**两份一起读进来**（越具体越靠后）。面板会提示这一点，但不替你合并。

### 会话里攒下来的规则

让模型「把这条记到项目规则里」，它会调用 `suggest_workspace_rule` 提交候选。候选**不写文件**，只落到面板的待确认区（存在 `$DSH_HOME/workspace-rules/pending/`，不进项目目录）：

- **加入** → 追加到编辑器最后一条，标为未保存。**你点保存才真正写入文件**
- **忽略** → 丢掉这一条
- **全部忽略** → 清空（会二次确认）

文本编辑模式下「加入」是禁用的——那里没有条目落点，先切回条目编辑。

保存后：

- **新会话**在第一步就读到最新内容
- **当前会话**可能仍按旧内容工作 —— 工作区层会热重载，但**已经进入上下文的旧指令不会被撤回**。所以不必重开对话，也不要指望旧规则立刻失效

面板底部的诊断区会显示：当前加载状态、取自哪个会话、指令文件的加载链（只显示文件是否存在与字节数）、当前模式下的 `exclude` 状态。

## 它怎么工作

```
  ┌─────────────────────────────┐
  │  DSH 内置加载器              │   ← 真正负责注入
  │  dsh-agent-instructions      │
  └──────────────┬──────────────┘
                 │ 读取
                 ▼
    <项目>/CLAUDE.local.md  (本机)
    <项目>/CLAUDE.md        (同步)
                 ▲
                 │ 读写（HTTP）
  ┌──────────────┴──────────────┐
  │  dsh-workspace-rules         │   ← 本插件，只管编辑
  │  host: /api/workspace-rules  │
  │  client: 设置页面板           │
  └─────────────────────────────┘
```

- **host 端**（`lib/index.js`）：通过 `ctx.connection.fetch.register` 注册 `GET/POST /api/workspace-rules`，走 Connection 的 `/api` 通道，自动落在 Host/Origin 栅栏与浏览器鉴权之内；另注册 `suggest_workspace_rule` 工具供会话提交候选
- **client 端**（`lib/client.js`）：手写 `window.__ModuleLoader__.load` bundle，`require('react')` 后 `createElement` 渲染，无 JSX、无打包器
- **写入**：临时文件 + rename 原子写；`EPERM`/`EBUSY` 重试后降级直写并在响应里标记
- **并发**：`baseMtimeMs` 乐观锁，冲突返回 409 并区分 `appeared` / `changed` / `removed`
- **备份**：覆盖前把旧内容存到 `$DSH_HOME/backups/workspace-rules/`，**不落项目目录**（落在项目里会让 exclude 的精确匹配失效）

### 为什么同步模式只能写 `CLAUDE.md`

加载器认的四个名字是写死的：`AGENTS.md`、`CLAUDE.md`、`AGENTS.local.md`、`CLAUDE.local.md`。想加第五个名字得改 `dsh-agent-instructions` 的配置，而那份配置嵌在 Agent preset 里，bundle patch 打不到（写 `id: 'preset-standard:agent-instructions'` 会被静默忽略，不报错）。

自己接管注入要重写官方那套 63 KB 的逻辑——包括会话恢复对账、compaction 后再注入、子 agent 继承、增量去重。漏一处就表现为「规则时有时无」，比换个文件名糟得多。所以同步模式用 `CLAUDE.md`。

## 重要限制

- **没有会话级隔离**。同一工作区的所有会话共享同一份规则文件。
- **只写两个文件名**：`CLAUDE.local.md`（同步关闭）或 `CLAUDE.md`（同步打开）。同目录下的 `AGENTS.md`、`AGENTS.local.md` 若存在，面板只提示它们存在，不改动、不预览。
- **exclude 检查是保存时刻的一次性动作**，且只对「同步关闭」有意义。之后的忽略规则是否被改动，插件不知道。手动做法：

  ```bash
  echo "CLAUDE.local.md" >> .git/info/exclude
  ```

  用 `.git/info/exclude` 而不是 `.gitignore`：前者完全不进版本库，同事看不到任何痕迹。

- **无 git 仓库时降级为警告**，不阻断保存（你可能只是想要一个本地草稿）。
- **原生加载器按目录链加载**：项目根到当前会话目录的每一层都会扫。越具体的文件优先级越高 —— 这一点由 DSH 决定，不是本插件的行为。
- **候选项的存储不跟着项目走**。待确认区存在 `$DSH_HOME` 下，删掉项目目录后这些候选还在（它们本来就没被确认过）。

## 兼容性

| 项 | 值 |
|---|---|
| DSH | `>= 0.2.1-rc.5 < 0.3.0-0` |
| 已在下列版本实测 | `0.2.1-rc.5`、`0.2.2-rc.1` |
| Node | `>= 20` |
| profile | `web`（桌面版同理，但不经 CLI 安装） |
| 运行时依赖 | 无 |

兼容范围写在 `package.json` 的 `engines.dsh` 里。DSH 在加载 bundle 前会拿它做准入判断：范围内的版本正常加载，范围外（0.3.0 起）**直接跳过本插件并在诊断里写明原因**，而不是装进去之后静默出错。

必须声明的原因：不写 `engines.dsh` 也不写 `peerDependencies` 时，DSH 会认为「没有任何要求未满足」，等于对**所有**版本宣称兼容——碰上新宿主真的改了 API，坏的是运行时而不是准入检查，用户只会看到面板打不开。`dsh.compatibility.dshReleases` 另外逐个记录实测过的版本，供插件列表与市场展示。

## 许可证

[MIT](LICENSE)

---

<div align="center">

如果这个插件帮你省下了每次重复交代规则的时间，欢迎给个 ⭐

</div>
