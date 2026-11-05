<div align="center">

<img src="https://raw.githubusercontent.com/winson-young/dsh-workspace-rules/main/icon.svg" width="88" height="88" alt="dsh-workspace-rules">

# dsh-workspace-rules

**每个项目一份私有约定，新会话自动载入。**

简体中文 | [English](README.en.md)

[![npm version](https://img.shields.io/npm/v/dsh-workspace-rules?style=flat-square&label=npm&color=cb3837)](https://www.npmjs.com/package/dsh-workspace-rules)
[![npm downloads](https://img.shields.io/npm/dm/dsh-workspace-rules?style=flat-square&label=downloads%2Fmonth&color=1F883D)](https://www.npmjs.com/package/dsh-workspace-rules)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.1--rc.5-6366f1?style=flat-square)](#兼容性)
[![node](https://img.shields.io/badge/node-%3E%3D20-339933?style=flat-square)](#开发)
[![dependencies](https://img.shields.io/badge/runtime%20deps-0-brightgreen?style=flat-square)](#开发)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

</div>

[亮点](#亮点) · [安装](#安装) · [使用](#使用) · [它怎么工作](#它怎么工作) · [重要限制](#重要限制) · [兼容性](#兼容性) · [开发](#开发) · [更新日志](CHANGELOG.md)

---

「不要写无意义的强制类型转换」「SQL 都收敛进 model 层」——这类话每个项目都要重复说一遍。

这个插件把它们变成**项目里的一份文件**，新会话自动载入；同时给你一个设置面板，不用每次开编辑器。

## 亮点

| | |
|---|---|
| **注入不归它管** | 规则由 DSH 内置的 `dsh-agent-instructions` 原生加载 `<项目>/CLAUDE.local.md`。插件只负责读写这个文件，**它坏了，规则照样生效** |
| **按工作区隔离** | A 项目的约定不会出现在 B 项目里。文件就在项目目录下，天然隔离 |
| **不污染同事** | `CLAUDE.local.md` 是「本地私有」约定，配合 `.git/info/exclude` 完全不进版本库，同事的 Cursor / Codex / [CC] 看不到任何痕迹 |
| **git 泄露防护** | 保存前自动补 `.git/info/exclude`；文件已被索引追踪时直接拒绝并提示 `git rm --cached`。兼容子模块与 worktree |
| **加载状态判据** | 面板会告诉你「这个会话读到的规则是不是磁盘上这份」，用的是会话里真实的 `digest` 比对，不是猜的 |
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
3. 写下这个项目的约定
4. 保存

```markdown
# 编码约定

- 不要写无意义的强制类型转换
- 所有 SQL 收敛进 model 层，不要在 service / handler 里拼 SQL
- 改动前先确认现有实现，别重复造轮子
```

保存后：

- **新会话**在第一步就读到最新内容
- **当前会话**可能仍按旧内容工作 —— 工作区层会热重载，但**已经进入上下文的旧指令不会被撤回**。所以不必重开对话，也不要指望旧规则立刻失效

面板底部的诊断区会显示：当前加载状态、取自哪个会话、指令文件的加载链（只显示文件是否存在与字节数）、`exclude` 路径。

## 它怎么工作

```
  ┌─────────────────────────────┐
  │  DSH 内置加载器              │   ← 真正负责注入
  │  dsh-agent-instructions      │
  └──────────────┬──────────────┘
                 │ 读取
                 ▼
        <项目>/CLAUDE.local.md     ← 数据，纯 Markdown
                 ▲
                 │ 读写（HTTP）
  ┌──────────────┴──────────────┐
  │  dsh-workspace-rules         │   ← 本插件，只管编辑
  │  host: /api/workspace-rules  │
  │  client: 设置页面板           │
  └─────────────────────────────┘
```

- **host 端**（`lib/index.js`）：通过 `ctx.connection.fetch.register` 注册 `GET/POST /api/workspace-rules`，走 Connection 的 `/api` 通道，自动落在 Host/Origin 栅栏与浏览器鉴权之内
- **client 端**（`lib/client.js`）：手写 `window.__ModuleLoader__.load` bundle，`require('react')` 后 `createElement` 渲染，无 JSX、无打包器
- **写入**：临时文件 + rename 原子写；`EPERM`/`EBUSY` 重试后降级直写并在响应里标记
- **并发**：`baseMtimeMs` 乐观锁，冲突返回 409 并区分 `appeared` / `changed` / `removed`
- **备份**：覆盖前把旧内容存到 `$DSH_HOME/backups/workspace-rules/`，**不落项目目录**（落在项目里会让 exclude 的精确匹配失效）

## 重要限制

- **没有会话级隔离**。同一工作区的所有会话共享同一份规则文件。
- **只管理 `CLAUDE.local.md` 一个文件名**。同目录下的 `AGENTS.md`、`CLAUDE.md`、`AGENTS.local.md` 若存在，面板只提示它们存在，不改动、不预览。
- **exclude 检查是保存时刻的一次性动作**。之后的忽略规则是否被改动，插件不知道。手动做法：

  ```bash
  echo "CLAUDE.local.md" >> .git/info/exclude
  ```

  用 `.git/info/exclude` 而不是 `.gitignore`：前者完全不进版本库，同事看不到任何痕迹。

- **无 git 仓库时降级为警告**，不阻断保存（你可能只是想要一个本地草稿）。
- **原生加载器按目录链加载**：项目根到当前会话目录的每一层都会扫。越具体的文件优先级越高 —— 这一点由 DSH 决定，不是本插件的行为。

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

## 开发

零运行时依赖，零构建。host 与 client 两端源码即产物（纯 ESM）。

```bash
node --check lib/index.js
node --check lib/client.js
```

```
dsh-workspace-rules/
├── .github/workflows/
│   └── publish.yml    # tag 推送时自动发布到 npm
├── cordis.patch.yml   # bundle patch：把 workspace-rules 层插进 profile
├── icon.svg           # 插件页图标
├── lib/
│   ├── index.js       # host：/api/workspace-rules（Node ESM）
│   └── client.js      # client：设置面板（__ModuleLoader__ bundle）
├── package.json
└── README.md
```

### 发布

改好 `package.json` 的 version，推 tag 就行：

```bash
git tag v0.1.3 && git push origin main --tags
```

`.github/workflows/publish.yml` 会依次：语法自检 → 校验 tag 与 `package.json` 的 version 一致 → 已发布则跳过 → `npm publish --provenance`。

认证优先用仓库 secret `NPM_TOKEN`；没配则回退到 npm 的 Trusted Publishing（OIDC），此时需要在 npmjs.com 上为该仓库和这个 workflow 配一次 trusted publisher。

## 许可证

[MIT](LICENSE)

---

<div align="center">

如果这个插件帮你省下了每次重复交代规则的时间，欢迎给个 ⭐

</div>
