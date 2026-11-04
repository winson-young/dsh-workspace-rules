# dsh-workspace-rules

按工作区管理 DSH 项目私有指令（`CLAUDE.local.md`），带设置面板。

> **状态：0.1.1**。设置面板可读写、含 git 泄露防护与加载状态判据。已在 DSH 0.2.1-rc.5 + Node 22 上实测。
>
> 已发布到 npm：[dsh-workspace-rules](https://www.npmjs.com/package/dsh-workspace-rules)。

## 它做什么

给每个项目维护一份只存在于本机的编码约定：

- **注入**：完全交给 DSH 内置的 `@deepseek-ai/dsh-agent-instructions`，它原生加载项目内的 `CLAUDE.local.md`。
- **编辑**：本插件只负责读写这个文件，不碰 `system-prompt/assemble`，不做任何提示词注入。

这个解耦是刻意的：**插件坏了，规则照样生效**。

## 重要限制

- **新会话一定读到最新内容。** 当前会话可能仍按旧内容工作——工作区层会热重载，但已经进入上下文的旧指令不会被撤回。所以保存后不必重开对话，也不要指望旧规则立刻失效。
- 同一工作区的所有会话共享同一份规则文件，没有会话级隔离。
- 只管理 `CLAUDE.local.md` 一个文件名。同目录下的 `AGENTS.md`、`CLAUDE.md`、`AGENTS.local.md` 若存在，面板只提示它们存在，不改动、不预览。
- 规则文件**不应提交到版本库**。插件在保存前会检查 `.git/info/exclude`，缺则自动追加；但这是保存时刻的一次性检查，之后的忽略规则是否被改动，插件不知道。

  手动做法是：

  ```bash
  echo "CLAUDE.local.md" >> .git/info/exclude
  ```

  用 `.git/info/exclude` 而不是 `.gitignore`：前者完全不进版本库，同事看不到任何痕迹。

- 保存时如果发现该文件**已经在 git 索引里**，会直接拒绝并提示先执行 `git rm --cached CLAUDE.local.md`——被索引追踪的文件，忽略规则对它无效。

## 安装

```bash
dsh plugin --profile web add dsh-workspace-rules
```

`web` 换成你想装进去的 profile 名。装完重启 DSH 进程，设置页多出「工作区规则」一节。

因为本包零构建（源码即产物），安装不需要跑任何 build 步骤。

也可以直接从 GitHub 装（拿到的是最新提交，可能比 npm 上的版本新）：

```bash
dsh plugin --profile web add github:winson-young/dsh-workspace-rules
```

> 每个 profile 是独立环境。桌面版由 Electron 独占管理，CLI 装不进 `desktop` profile。

开发期挂本地源码用 `link:`：

```bash
dsh plugin --profile web add link:D:/Projects/dsh-workspace-rules
```

注意用 `link:` 而不是 `file:`。`file:` 是**复制**，之后改代码完全不生效，且不会有任何提示。

## 开发

零运行时依赖，零构建。host 与 client 两端源码即产物（纯 ESM）。

```bash
node --check lib/index.js
node --check lib/client.js
```

- `lib/index.js`：host 端。注册 `/api/workspace-rules` 端点，负责 git 上下文识别、`.git/info/exclude` 维护、原子写、会话加载状态判定。
- `lib/client.js`：client 端。手写 `window.__ModuleLoader__.load` bundle，`require('react')` 后用 `createElement` 渲染，不依赖 JSX 与打包器。

## 许可证

MIT