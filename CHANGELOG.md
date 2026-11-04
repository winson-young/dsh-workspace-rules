# Changelog

## 0.1.1 — 2026-11-04

- **修复**：长会话的加载状态永远显示「无法确认」。原因是正序扫描在 4000 条事件预算内走不到最后一条指令事件（实测 4547 条事件、答案在 88.7% 处的会话）。改为倒序扫描 + 目标文件定案即停，事件总数用二分探测；再补一条 mtime 判据（磁盘文件早于会话创建即视为会话期间未改动）

## 0.1.0 — 2026-11-04

首个可用版本。分发方式：GitHub（`dsh plugin add github:winson-young/dsh-workspace-rules`），尚未发布到 npm。

### M0a · 插件骨架

- `package.json` / `cordis.patch.yml` / `lib/index.js` / `lib/client.js`
- 设置页新增「工作区规则」分区，内容为空占位
- host 端为空实现，不注册端点、不读写文件

### M1 · 功能闭环

**读写**

- `GET /api/workspace-rules?dir=<绝对路径>` 返回文件内容与元数据：`{exists, content, path, mtimeMs, sizeBytes, eol, mixedEol, bom, digest, truncated, overLimit}`
- `POST /api/workspace-rules` 写入，带 `baseMtimeMs` 做乐观锁；不匹配返回 409 并区分 `appeared` / `changed` / `removed` 三种原因
- 首次创建固定 **LF + 无 BOM**；读取时剥离既有 BOM；响应回 `eol` / `bom` / `mixedEol` 供 UI 提示
- 同目录临时文件 + rename 原子写，`EPERM`/`EBUSY` 重试后降级直写并在响应里标记 `atomic: false`
- 覆盖前把旧内容备份到 `$DSH_HOME/backups/workspace-rules/<hash>/`，**不落项目目录**（落在项目里会让 exclude 的精确匹配失效）

**git 泄露防护**

- 保存前识别 git 上下文，兼容普通仓库、`.git` 为文件（子模块）、`commondir` 重定向（worktree）
- `.git/info/exclude` 缺规则则自动追加 `CLAUDE.local.md` 与 `.CLAUDE.local.md.tmp-*`；只追加、不重排、注释头只写一次
- **先建 exclude 再写内容**：exclude 失败则整个保存中止，什么都不写，避免造出「文件已存在但没被排除」的状态
- 文件已在索引中被追踪时硬拒绝（409 `tracked`），提示先 `git rm --cached`
- 无 git 仓库时降级为警告，不阻断保存

**加载状态判据**

- 通过 `ctx.workspaceRegistry` / `ctx.sessionPersistence` 定位工作区与最近会话，不使用目录名反推路径
- 读最近会话的 baseline 与增量事件，取 `agent-instructions` 的 `digest` 与磁盘内容 sha1 比对，区分「已加载且一致」/「加载的是旧版本」/「无法确认」
- 倒序扫描会话事件：目标文件一经定案立刻停止，长会话不必走完全程（正序实现会在预算耗尽时把「其实已有答案」错报成未确认）
- 事件总数靠二分探测（读越界返回空数组），不依赖 `stat()` —— 它不返回 `eventCount`
- 补充 mtime 判据：磁盘文件早于会话创建时刻即视为会话期间未改动，baseline 即终态，避免为「后面没有更新」而扫完全程
- 仍有事件预算，真超预算时降级为「未确认」，不谎报一致
- 最新会话若还没发过消息（没有 baseline），最多回看 `STATUS_PROBE_SESSIONS = 3` 个，取第一个有记录的，并在诊断区说明「状态取自上一个有记录的会话」——否则用户每新建一个空会话，状态就会莫名失效
- UI 显示主语（哪个会话、哪个 cwd），不写笼统的「已生效」

**面板**

- 工作区下拉（标题 + 完整绝对路径）+ 手动填写目录兜底
- 脏检查：有未保存修改时切换工作区要确认；保存冲突时只给「覆盖 / 放弃我的修改」两键，不做 diff
- 诊断信息折叠区：加载状态、会话 id、指令文件加载链（只显示文件是否存在与字节数，不显示内容）、exclude 路径
- 文案边界：可说「新会话一定读取最新内容」，不说「实时生效」，也不说「需要新会话才生效」

**工程**

- 零运行时依赖、零构建：client 用手写 `window.__ModuleLoader__.load` bundle，`createElement` 渲染，无 JSX
- 加载器支持的文件名与大小上限从会话里的 `baselineIdentity` 读取，不硬编码
