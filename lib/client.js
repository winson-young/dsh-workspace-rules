/**
 * dsh-workspace-rules · client 端
 *
 * 设置页里的一个分区：选择工作区 → 编辑 `CLAUDE.local.md` → 保存。
 *
 * 手写 bundle 说明：宿主通过 window.__ModuleLoader__.load({ id, factory })
 * 加载本文件，factory 收到一个同步的 require。react 由宿主提供，
 * 这里绝不能自己打包一份进去（否则同页出现两个 React 实例）。
 *
 * 本端只发请求、不读写文件：所有路径校验、原子写、git 防护都在 host 侧，
 * 这样面板被绕过也不会破坏文件。
 */
window.__ModuleLoader__.load({
  id: 'dsh-workspace-rules',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    var react = require('react');
    var h = react.createElement;
    var useState = react.useState;
    var useEffect = react.useEffect;
    var useCallback = react.useCallback;
    var useRef = react.useRef;

    var NS = 'workspace-rules';
    var inject = ['slots', 'locale'];

    var API = '/api/workspace-rules';

    var DICTS = {
      zh: {
        label: '工作区规则',
        heading: '项目规则',
        intro: '由 DSH 内置指令加载器直接读取的项目约定。默认只留在本机；打开「同步到项目」后写入 CLAUDE.md，随版本库共享给团队。',
        workspace: '工作区',
        workspaceDesc: '只写入所选目录下的规则文件，子目录不受影响',
        targetLabel: '同步到项目',
        targetLocalDesc: '关闭：写入 CLAUDE.local.md 并加入 .git/info/exclude，规则只留在本机',
        targetSyncDesc: '开启：写入 CLAUDE.md，会随版本库提交，团队里每个人都会读到',
        targetToggle: '切换是否同步到项目',
        targetSibling: '注意：同一个目录里还有 {file}，加载器会把两份规则一起读进来',
        pendingTitle: '待确认的规则',
        pendingDesc: '这些是会话过程中发现、可能值得沉淀成约定的内容。加入后只放进编辑器，你点保存才会写入文件。',
        pendingClear: '全部忽略',
        pendingClearConfirm: '确定忽略全部待确认的规则吗？',
        pendingAdopt: '加入',
        pendingDismiss: '忽略',
        adopted: '已加入编辑器，保存后才会写入文件',
        adoptNeedsItems: '当前是文本编辑模式，先切回条目编辑才能加入',
        workspaceEmpty: '还没有注册过工作区',
        workspaceUnavailable: '当前宿主没有提供工作区列表，请手动填写目录',
        manualToggle: '手动填写目录',
        manualHide: '使用工作区列表',
        manualLabel: '目录绝对路径',
        manualPlaceholder: 'D:\\Projects\\my-project',
        load: '读取',
        loading: '读取中…',
        editorLabel: '规则内容',
        editorPlaceholder: '例如：\n\n- 提交前先跑 pnpm test\n- 不要引入新的运行时依赖\n- 所有 SQL 收敛在 model 层',
        itemLabel: '第',
        itemPlaceholder: '写一条约定，回车继续下一条',
        itemAdd: '+ 添加一条',
        itemsEmpty: '还没有任何规则。点下面的「添加一条」开始写。',
        moveUp: '上移',
        moveDown: '下移',
        remove: '删除',
        modeText: '直接编辑 Markdown',
        modeItems: '返回条目编辑',
        parseNotList: '这个文件不是简单的规则列表（没有找到 `- ` 列表项），已切换为文本编辑，避免保存时把它重排。',
        parseComplex: '这个文件里有嵌套列表、缩进续行或代码块，条目编辑会改坏结构，已切换为文本编辑。',
        preambleKept: '文件开头的标题与说明会原样保留，不在这里显示。需要修改请切到文本编辑。',
        save: '保存',
        saving: '保存中…',
        saved: '已保存',
        dirty: '有未保存的修改',
        unsavedSwitch: '切换工作区会丢弃未保存的修改，确定吗？',
        conflict: '文件在读取之后被外部修改了。',
        conflictOverwrite: '覆盖外部修改',
        conflictDiscard: '放弃我的修改',
        cancel: '取消',
        retry: '重试',
        empty: '这个目录还没有规则文件，写入后会立即创建。',
        sizeLabel: '大小',
        updatedLabel: '修改时间',
        pathLabel: '文件',
        eolCrlf: '当前文件使用 CRLF 换行',
        eolMixed: '当前文件混用了 CRLF 与 LF',
        bomPresent: '当前文件带 UTF-8 BOM',
        overLimit: '内容超过加载器上限 64 KiB，超出的部分不会被加载',
        truncated: '文件过大，编辑器只载入了前 4 MiB',
        diag: '诊断信息',
        diagGitNone: '未检测到 git 仓库，无法自动忽略此文件',
        diagGitExcluded: '已在 .git/info/exclude 中忽略',
        diagGitNotExcluded: '检测时未在 .git/info/exclude 中找到忽略规则',
        diagGitLinked: '当前目录位于 git worktree 或 submodule 中',
        diagGitTracked: '警告：这个文件已被 git 索引追踪，忽略规则对它无效，保存会被拒绝',
        diagChain: '加载器会同时读取这些文件',
        diagChainMore: '同一会话还会加载其他目录的规则',
        diagStatusLoaded: '最近一次会话已加载当前内容',
        diagStatusStale: '最近一次会话加载的是旧版本：当前会话可能仍按旧内容工作，新会话一定读取最新内容',
        diagStatusNotListed: '最近一次会话没有加载这个文件',
        diagStatusNoSession: '这个工作区还没有可用会话',
        diagStatusNoWorkspace: '目录未注册为工作区，无法判断加载状态',
        diagStatusUnavailable: '宿主没有提供会话服务，无法判断加载状态',
        diagStatusUnknown: '无法判断加载状态',
        diagStatusPartial: '会话记录过长，无法确认最新一次加载；当前会话可能仍按旧内容工作',
        diagStatusSession: '依据会话',
        diagStatusSkipped: '更新的会话还没发出消息，状态取自上一个有记录的会话',
        diagLimit: '加载器单文件上限',
        diagSyncIgnored: '警告：CLAUDE.md 已被忽略规则挡住，提交时不会带上它，同步不会生效',
        diagSyncTarget: '同步模式：写入 CLAUDE.md，会随版本库提交',
        errReadFailed: '读取失败',
        errSaveFailed: '保存失败',
        errExcludeFailed: '无法写入 .git/info/exclude，已取消保存，避免留下一份未被忽略的本机规则',
        errTracked: '这个文件已经在版本库索引里，忽略规则无效。请先执行 git rm --cached CLAUDE.local.md，再保存。',
        errNetwork: '无法连接到宿主',
      },
      en: {
        label: 'Workspace Rules',
        heading: 'Project rules',
        intro: 'Project conventions read directly by the built-in DSH instruction loader. By default they stay on this machine; turning on “Sync to project” writes CLAUDE.md so the whole team shares them.',
        workspace: 'Workspace',
        workspaceDesc: 'Only CLAUDE.local.md in the selected directory is written; subdirectories are unaffected',
        targetLabel: 'Sync to project',
        targetLocalDesc: 'Off: writes CLAUDE.local.md and adds it to .git/info/exclude, so the rules stay on this machine',
        targetSyncDesc: 'On: writes CLAUDE.md, which is committed with the repository and read by everyone on the team',
        targetToggle: 'Toggle syncing the rules to the project',
        targetSibling: 'Note: {file} also exists in this directory, and the loader reads both files together',
        pendingTitle: 'Rules awaiting confirmation',
        pendingDesc: 'These were noticed during conversations and may be worth keeping as conventions. Adding one only puts it in the editor; nothing is written until you save.',
        pendingClear: 'Dismiss all',
        pendingClearConfirm: 'Dismiss every rule awaiting confirmation?',
        pendingAdopt: 'Add',
        pendingDismiss: 'Dismiss',
        adopted: 'Added to the editor; it is written only after you save',
        adoptNeedsItems: 'The text editor is active; switch back to the rule editor to add this',
        workspaceEmpty: 'No workspace registered yet',
        workspaceUnavailable: 'This host exposes no workspace list; type a directory instead',
        manualToggle: 'Type a directory',
        manualHide: 'Use the workspace list',
        manualLabel: 'Absolute directory path',
        manualPlaceholder: 'D:\\Projects\\my-project',
        load: 'Load',
        loading: 'Loading…',
        editorLabel: 'Rules',
        editorPlaceholder: 'For example:\n\n- Run pnpm test before committing\n- Do not add runtime dependencies\n- Keep all SQL in the model layer',
        itemLabel: 'Rule',
        itemPlaceholder: 'Write one rule; press Enter for the next',
        itemAdd: '+ Add a rule',
        itemsEmpty: 'No rules yet. Use “Add a rule” below to start.',
        moveUp: 'Move up',
        moveDown: 'Move down',
        remove: 'Delete',
        modeText: 'Edit Markdown directly',
        modeItems: 'Back to rule editor',
        parseNotList: 'This file is not a plain rule list (no `- ` items found), so it opened in the text editor to avoid reflowing it on save.',
        parseComplex: 'This file contains nested lists, indented continuation lines, or code blocks; editing it as rules would damage the structure, so it opened in the text editor.',
        preambleKept: 'The title and notes at the top of the file are preserved as-is and not shown here. Use the text editor to change them.',
        save: 'Save',
        saving: 'Saving…',
        saved: 'Saved',
        dirty: 'Unsaved changes',
        unsavedSwitch: 'Switching workspaces discards unsaved changes. Continue?',
        conflict: 'The file changed outside this panel after it was read.',
        conflictOverwrite: 'Overwrite',
        conflictDiscard: 'Discard my changes',
        cancel: 'Cancel',
        retry: 'Retry',
        empty: 'No rules file here yet; saving creates it.',
        sizeLabel: 'Size',
        updatedLabel: 'Modified',
        pathLabel: 'File',
        eolCrlf: 'The current file uses CRLF line endings',
        eolMixed: 'The current file mixes CRLF and LF',
        bomPresent: 'The current file carries a UTF-8 BOM',
        overLimit: 'Content exceeds the loader limit of 64 KiB; the excess will not load',
        truncated: 'File too large; only the first 4 MiB is loaded',
        diag: 'Diagnostics',
        diagGitNone: 'No git repository found, so this file cannot be ignored automatically',
        diagGitExcluded: 'Ignored through .git/info/exclude',
        diagGitNotExcluded: 'No ignore rule found in .git/info/exclude at check time',
        diagGitLinked: 'This directory is a git worktree or submodule',
        diagGitTracked: 'Warning: this file is already tracked by git; ignore rules do not apply and saving will be refused',
        diagChain: 'The loader also reads these files',
        diagChainMore: 'Sessions also load rules from other directories',
        diagStatusLoaded: 'The latest session loaded exactly this content',
        diagStatusStale: 'The latest session loaded an older version: this session may still follow the old content, while a new session is guaranteed to read the latest',
        diagStatusNotListed: 'The latest session did not load this file',
        diagStatusNoSession: 'This workspace has no usable session yet',
        diagStatusNoWorkspace: 'Directory is not a registered workspace, so loading state is unknown',
        diagStatusUnavailable: 'The host exposed no session service, so loading state is unknown',
        diagStatusUnknown: 'Loading state unknown',
        diagStatusPartial: 'The session log is too long to confirm its latest load; this session may still follow the old content',
        diagStatusSession: 'Based on session',
        diagStatusSkipped: 'Newer sessions have not sent a message yet, so this state comes from the last session that did',
        diagLimit: 'Loader limit per file',
        diagSyncIgnored: 'Warning: CLAUDE.md is covered by an ignore rule, so it will not be committed and syncing will not take effect',
        diagSyncTarget: 'Sync mode: writes CLAUDE.md, which is committed with the repository',
        errReadFailed: 'Read failed',
        errSaveFailed: 'Save failed',
        errExcludeFailed: 'Could not write .git/info/exclude; the save was cancelled to avoid leaving an unprotected local rules file',
        errTracked: 'This file is already tracked by git, so ignore rules do not apply. Run git rm --cached CLAUDE.local.md, then save.',
        errNetwork: 'Cannot reach the host',
      },
    };

    /**
     * 视觉层：对齐 DSH 设置页自身的控件规格。
     *
     * 实测（从宿主设置页通用分区的计算样式得到）：控件高 36px、圆角 12px、
     * 无边框、底色浅灰、正文 14px/22px、说明文字 12px/18px、设置项上下留白 16px。
     * 主题切换靠 `html[style="color-scheme: dark"]`，所以这里统一用 `light-dark()`
     * 表达两套色值，而不是硬编码某一套。
     */
    var STYLE_ID = 'dsh-workspace-rules-styles';

    var CSS_TEXT = [
      '.wr-root{display:flex;flex-direction:column;width:100%;min-width:0;font-size:14px;line-height:22px;color:light-dark(#0f1115,#f9fafb)}',
      '.wr-title{margin:0;font-size:14px;font-weight:500;line-height:22px}',
      '.wr-intro{margin:4px 0 0;font-size:12px;line-height:18px;color:light-dark(#81858c,#adb2b8)}',

      '.wr-row{display:flex;align-items:center;gap:12px;padding:16px 0;border-top:1px solid light-dark(rgba(0,0,0,.07),rgba(255,255,255,.08))}',
      '.wr-row:first-of-type{border-top:0}',
      '.wr-row-text{flex:1 1 auto;min-width:0}',
      '.wr-row-title{font-size:14px;line-height:22px}',
      '.wr-row-desc{margin-top:2px;font-size:12px;line-height:18px;color:light-dark(#81858c,#adb2b8)}',
      '.wr-row-control{display:flex;align-items:center;gap:8px;flex:0 0 auto;min-width:0}',
      '.wr-field{display:flex;align-items:center;gap:8px;padding:0 0 16px}',
      '.wr-field>.wr-input{flex:1 1 auto}',

      '.wr-control{box-sizing:border-box;display:inline-flex;align-items:center;gap:8px;height:36px;margin:0;padding:0 14px;border:0;border-radius:12px;background:light-dark(#f5f6f7,#353638);color:inherit;font:inherit;font-size:14px;line-height:22px;cursor:pointer;transition:background .12s ease,opacity .12s ease}',
      '.wr-control:hover:not(:disabled){background:light-dark(#eceef0,#3f4043)}',
      '.wr-control:focus-visible{outline:2px solid light-dark(#2f6fed,#7aa7ff);outline-offset:1px}',
      '.wr-control:disabled{opacity:.45;cursor:default}',
      '.wr-control-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px}',
      '.wr-chevron{flex:0 0 auto;opacity:.55;transition:transform .12s ease}',
      '.wr-control[aria-expanded="true"] .wr-chevron{transform:rotate(180deg)}',

      '.wr-primary{background:light-dark(#0f1115,#f9fafb);color:light-dark(#fff,#151517)}',
      '.wr-primary:hover:not(:disabled){background:light-dark(#2a2d34,#e4e6e9)}',
      // 反色主按钮在禁用态会变成一块半透明黑，比普通控件的禁用灰更难看也更难读。
      '.wr-primary:disabled{background:light-dark(#f5f6f7,#353638);color:inherit}',

      '.wr-pop{position:fixed;z-index:900;box-sizing:border-box;min-width:240px;max-height:320px;overflow-y:auto;padding:6px;border-radius:14px;background:light-dark(#fff,#232325);border:1px solid light-dark(rgba(0,0,0,.1),rgba(255,255,255,.12));box-shadow:0 12px 32px light-dark(rgba(0,0,0,.16),rgba(0,0,0,.5)),0 2px 8px light-dark(rgba(0,0,0,.06),rgba(0,0,0,.3))}',
      '.wr-opt{display:block;box-sizing:border-box;width:100%;margin:0;padding:8px 10px;border:0;border-radius:10px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}',
      '.wr-opt:hover,.wr-opt[data-active="true"]{background:light-dark(#f0f2f4,#303032)}',
      '.wr-opt[aria-selected="true"]{background:light-dark(#e9efff,#2b3550)}',
      '.wr-opt-title{font-size:14px;line-height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.wr-opt-path{margin-top:2px;font-size:12px;line-height:16px;color:light-dark(#81858c,#adb2b8);font-family:var(--dsh-font-family-code-default,ui-monospace,SFMono-Regular,Menlo,monospace);word-break:break-all}',
      '.wr-opt-empty{padding:10px;font-size:13px;color:light-dark(#81858c,#adb2b8)}',

      '.wr-input{box-sizing:border-box;width:100%;min-width:0;height:36px;margin:0;padding:0 12px;border:0;border-radius:12px;background:light-dark(#f5f6f7,#353638);color:inherit;font:inherit;font-size:14px}',
      '.wr-input::placeholder{color:light-dark(#a6aab0,#7b8087)}',
      '.wr-input:focus-visible{outline:2px solid light-dark(#2f6fed,#7aa7ff);outline-offset:1px}',

      '.wr-editor-wrap{padding:16px 0 0;border-top:1px solid light-dark(rgba(0,0,0,.07),rgba(255,255,255,.08))}',
      '.wr-editor{box-sizing:border-box;display:block;width:100%;min-width:0;min-height:240px;margin:8px 0 0;padding:12px 14px;border:0;border-radius:12px;background:light-dark(#f5f6f7,#353638);color:inherit;font-family:var(--dsh-font-family-code-default,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:13px;line-height:1.65;resize:vertical}',
      '.wr-editor::placeholder{color:light-dark(#a6aab0,#7b8087)}',
      '.wr-editor:focus-visible{outline:2px solid light-dark(#2f6fed,#7aa7ff);outline-offset:1px}',

      '.wr-items{display:flex;flex-direction:column;gap:6px;margin:8px 0 0}',
      '.wr-item{display:flex;align-items:center;gap:6px;min-width:0}',
      '.wr-item-no{flex:0 0 auto;width:16px;text-align:right;font-size:12px;line-height:18px;color:light-dark(#a6aab0,#7b8087);font-variant-numeric:tabular-nums;user-select:none}',
      '.wr-item-input{box-sizing:border-box;flex:1 1 auto;width:100%;min-width:0;height:32px;margin:0;padding:0 10px;border:0;border-radius:8px;background:light-dark(#f5f6f7,#353638);color:inherit;font:inherit;font-size:13px}',
      '.wr-item-input::placeholder{color:light-dark(#a6aab0,#7b8087)}',
      '.wr-item-input:focus-visible{outline:2px solid light-dark(#2f6fed,#7aa7ff);outline-offset:1px}',
      '.wr-icon{flex:0 0 auto;width:26px;height:26px;margin:0;padding:0;border:0;border-radius:8px;background:transparent;color:light-dark(#81858c,#adb2b8);font:inherit;font-size:13px;line-height:1;cursor:pointer}',
      '.wr-icon:hover:not(:disabled){background:light-dark(rgba(0,0,0,.05),rgba(255,255,255,.08));color:light-dark(#0f1115,#f9fafb)}',
      '.wr-icon:disabled{opacity:.3;cursor:default}',
      '.wr-icon:focus-visible{outline:2px solid light-dark(#2f6fed,#7aa7ff);outline-offset:1px}',
      '.wr-icon-danger:hover:not(:disabled){background:light-dark(rgba(229,72,77,.1),rgba(229,72,77,.18));color:light-dark(#c22a2f,#ff8b8f)}',
      '.wr-add{align-self:flex-start;height:30px;margin:2px 0 0 22px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:light-dark(#2f6fed,#7aa7ff);font:inherit;font-size:13px;cursor:pointer}',
      '.wr-add:hover{background:light-dark(rgba(47,111,237,.08),rgba(122,167,255,.14))}',
      '.wr-add:focus-visible{outline:2px solid light-dark(#2f6fed,#7aa7ff);outline-offset:1px}',
      '.wr-empty{margin:10px 0 0;padding:14px;border-radius:12px;background:light-dark(#f5f6f7,#353638);font-size:13px;line-height:20px;color:light-dark(#81858c,#adb2b8)}',
      '.wr-editor-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}',
      '.wr-link{margin:0;padding:0;border:0;background:transparent;color:light-dark(#2f6fed,#7aa7ff);font:inherit;font-size:12px;line-height:18px;cursor:pointer}',
      '.wr-link:hover{text-decoration:underline}',

      '.wr-meta{margin:6px 0 0;font-size:12px;line-height:18px;color:light-dark(#81858c,#adb2b8);font-family:var(--dsh-font-family-code-default,ui-monospace,SFMono-Regular,Menlo,monospace);word-break:break-all}',
      '.wr-meta-sep{margin:0 6px;opacity:.5}',
      '.wr-actions{display:flex;align-items:center;gap:12px;padding:16px 0 0}',
      '.wr-status{font-size:12px;line-height:18px;color:light-dark(#81858c,#adb2b8)}',

      '.wr-note{margin-top:10px;padding:10px 12px;border-radius:12px;font-size:12px;line-height:18px}',
      '.wr-note-warn{background:light-dark(#fff7e6,#33291a);color:light-dark(#7a5b16,#ecc97e)}',
      '.wr-note-error{background:light-dark(#fdeeee,#351f1f);color:light-dark(#8f2f2f,#f0a5a5)}',
      '.wr-note-actions{display:flex;gap:8px;margin-top:10px}',

      '.wr-switch{position:relative;box-sizing:border-box;width:40px;height:24px;margin:0;padding:0;border:0;border-radius:12px;background:light-dark(#e4e6e8,#464749);cursor:pointer;transition:background .16s ease}',
      '.wr-switch-knob{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.24);transition:transform .16s ease}',
      '.wr-switch-on{background:light-dark(#0f1115,#f9fafb)}',
      '.wr-switch-on .wr-switch-knob{transform:translateX(16px);background:light-dark(#fff,#0f1115)}',
      '.wr-switch:focus-visible{outline:2px solid light-dark(#2f6fed,#7aa7ff);outline-offset:2px}',
      '.wr-switch:disabled{opacity:.45;cursor:default}',

      '.wr-small{height:28px;padding:0 10px;border-radius:8px;font-size:12px;line-height:18px}',
      '.wr-pending{margin-top:16px;padding:14px 16px;border-radius:12px;background:light-dark(#f7f8f9,#292a2c)}',
      '.wr-pending-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}',
      '.wr-pending-item{display:flex;align-items:flex-start;gap:12px;margin-top:10px}',
      '.wr-pending-text{flex:1 1 auto;min-width:0;font-size:13px;line-height:20px;word-break:break-word}',
      '.wr-pending-actions{display:flex;flex:0 0 auto;gap:6px}',

      '.wr-diag{margin-top:16px;padding-top:12px;border-top:1px solid light-dark(rgba(0,0,0,.07),rgba(255,255,255,.08));font-size:12px;line-height:18px;color:light-dark(#81858c,#adb2b8)}',
      '.wr-diag>summary{cursor:pointer;list-style:none;padding:4px 0;color:light-dark(#61666b,#aeb3b9);user-select:none}',
      '.wr-diag>summary::-webkit-details-marker{display:none}',
      '.wr-diag>summary::before{content:"▸";display:inline-block;width:14px;transition:transform .12s ease}',
      '.wr-diag[open]>summary::before{transform:rotate(90deg)}',
      '.wr-diag-body{display:flex;flex-direction:column;gap:6px;margin-top:6px;font-family:var(--dsh-font-family-code-default,ui-monospace,SFMono-Regular,Menlo,monospace);word-break:break-all}',
      '.wr-diag-level{padding-left:14px}',
    ].join('\n');

    var sharedSheet = null;

    /**
     * 样式只注入一次。分区可能被反复挂载，重复插入会让样式表无限增长。
     *
     * 优先用可构造样式表挂到 document.adoptedStyleSheets：它不写 DOM，
     * 也不受 style-src 限制。宿主哪天收紧 CSP，`<style>` 会被静默拦掉，
     * 面板会退化成没有样式的裸 HTML，而 adoptedStyleSheets 不会。
     */
    function ensureStyles() {
      if (typeof document === 'undefined') return;
      if (sharedSheet || document.getElementById(STYLE_ID)) return;
      try {
        if (typeof CSSStyleSheet === 'function' && 'adoptedStyleSheets' in document) {
          var sheet = new CSSStyleSheet();
          sheet.replaceSync(CSS_TEXT);
          document.adoptedStyleSheets = Array.from(document.adoptedStyleSheets).concat(sheet);
          sharedSheet = sheet;
          return;
        }
      } catch (error) {
        // 落到下面的 <style> 路径，不要让样式注入失败拖垮整个分区。
      }
      var style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = CSS_TEXT;
      document.head.appendChild(style);
    }

    /**
     * 路径比较：Windows 下大小写与斜杠方向都不敏感，同一条目换写法不该被当成不同目录。
     * @param {string} left - 路径。
     * @param {string} right - 路径。
     * @returns {boolean} 是否同一条路径。
     */
    function samePath(left, right) {
      if (typeof left !== 'string' || typeof right !== 'string') return false;
      var norm = function (value) {
        return value.trim().replace(/[\\/]+$/, '').replace(/\//g, '\\').toLowerCase();
      };
      return norm(left) === norm(right);
    }

    /**
     * 统一的请求封装：同源 cookie 由浏览器自动携带，不手动拼 token。
     * @param {string} path - 相对 API 路径。
     * @param {object} [init] - fetch 选项。
     * @returns {Promise<object>} 解析后的 JSON。
     */
    function callApi(path, init) {
      var options = Object.assign({ credentials: 'same-origin' }, init || {});
      return fetch(path, options).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          return { ok: response.ok, status: response.status, body: body };
        });
      });
    }

    /**
     * 把毫秒时间戳变成简短可读文本。
     * @param {number} value - 毫秒时间戳。
     * @returns {string} 可读时间。
     */
    function formatTime(value) {
      if (typeof value !== 'number' || !isFinite(value)) return '—';
      try {
        return new Date(value).toLocaleString();
      } catch {
        return String(value);
      }
    }

    /**
     * 人类可读的字节数。
     * @param {number} value - 字节数。
     * @returns {string} 文本。
     */
    function formatBytes(value) {
      if (typeof value !== 'number' || !isFinite(value)) return '—';
      if (value < 1024) return value + ' B';
      if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KiB';
      return (value / (1024 * 1024)).toFixed(1) + ' MiB';
    }

    /**
     * 下拉箭头。用宿主设置页同一个 chevron 路径，颜色跟随文字色。
     * @param {boolean} open - 是否展开。
     * @returns {object} React 元素。
     */
    function chevron(open) {
      return h('svg', {
        className: 'wr-chevron',
        width: 14,
        height: 14,
        viewBox: '0 0 16 16',
        fill: 'none',
        strokeWidth: 1,
        'aria-hidden': 'true',
      }, h('path', { d: 'M4 6L7.29289 9.29289C7.68342 9.68342 8.31658 9.68342 8.70711 9.29289L12 6', stroke: 'currentColor' }));
    }

    /**
     * 工作区选择器。
     *
     * 刻意不用原生 `<select>`：实测宿主设置页根本没有原生 select，它自己的下拉都是
     * 「按钮 + 菜单」。原生 select 的选项文本会被最长一条撑开（工作区路径很长），
     * 而且弹层配色由系统决定，跟宿主的深浅色主题对不上。
     *
     * @param {object} props - { items, value, disabled, onChange, t }。
     * @returns {object} React 元素。
     */
    function Picker(props) {
      var t = props.t;
      var items = props.items || [];
      var [open, setOpen] = useState(false);
      var [active, setActive] = useState(-1);
      var [box, setBox] = useState(null);
      var buttonRef = useRef(null);
      var popRef = useRef(null);

      // 找到当前值对应的条目。目录可能是手填的、不在列表里，此时显示路径末段。
      var current = null;
      for (var index = 0; index < items.length; index += 1) {
        if (samePath(items[index].path, props.value)) { current = items[index]; break; }
      }
      var label = current ? current.title : (props.value || '');
      if (!current && props.value) {
        var trimmed = props.value.replace(/[\\/]+$/, '');
        var cut = trimmed.lastIndexOf('\\');
        label = cut >= 0 ? trimmed.slice(cut + 1) : trimmed;
      }

      /**
       * 计算弹层坐标：优先向下，空间不够就向上翻；右侧放不下就改右对齐。
       * 宽度按「按钮宽度」和「路径可读所需的最小宽度」取大者，再受视口约束。
       */
      function measure() {
        var node = buttonRef.current;
        if (!node) return;
        var rect = node.getBoundingClientRect();
        var gap = 6;
        var below = window.innerHeight - rect.bottom;
        var desired = Math.max(rect.width, 420);
        var width = Math.min(desired, Math.max(240, window.innerWidth - 16));
        var left = rect.left;
        if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
        var up = below < 220 && rect.top > below;
        var maxHeight = Math.min(320, Math.max(120, (up ? rect.top : below) - gap * 2));
        setBox({
          left: left,
          width: width,
          top: up ? null : rect.bottom + gap,
          bottom: up ? window.innerHeight - rect.top + gap : null,
          maxHeight: maxHeight,
        });
      }

      function close() {
        setOpen(false);
        setActive(-1);
      }

      // 打开时登记外部点击与滚动：祖先容器滚动会让固定定位的弹层脱离按钮，直接关掉更稳。
      // 注意 capture 阶段会收到弹层自己内部的滚动事件——那一类必须放过，否则列表一滚就关。
      useEffect(function () {
        if (!open) return undefined;
        measure();
        var onPointerDown = function (event) {
          var node = buttonRef.current;
          var pop = popRef.current;
          if (node && node.contains(event.target)) return;
          if (pop && pop.contains(event.target)) return;
          close();
        };
        var onScroll = function (event) {
          var pop = popRef.current;
          if (pop && event.target instanceof Node && pop.contains(event.target)) return;
          close();
        };
        var onResize = function () { close(); };
        document.addEventListener('mousedown', onPointerDown, true);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        return function () {
          document.removeEventListener('mousedown', onPointerDown, true);
          window.removeEventListener('scroll', onScroll, true);
          window.removeEventListener('resize', onResize);
        };
      }, [open]);

      function choose(target) {
        close();
        props.onChange(target);
      }

      function onKeyDown(event) {
        if (event.key === 'Escape') { close(); return; }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (!open) { setOpen(true); setActive(items.length > 0 ? 0 : -1); return; }
          if (items.length === 0) return;
          var step = event.key === 'ArrowDown' ? 1 : -1;
          var next = active < 0 ? (step > 0 ? 0 : items.length - 1) : (active + step + items.length) % items.length;
          setActive(next);
          return;
        }
        // 按钮收起态要能被 Enter / 空格打开，否则键盘用户只能靠方向键。
        if ((event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') && !open) {
          event.preventDefault();
          var currentIndex = -1;
          for (var pointer = 0; pointer < items.length; pointer += 1) {
            if (samePath(items[pointer].path, props.value)) { currentIndex = pointer; break; }
          }
          setOpen(true);
          setActive(currentIndex);
          return;
        }
        if (event.key === 'Home' && open) { event.preventDefault(); setActive(0); return; }
        if (event.key === 'End' && open) { event.preventDefault(); setActive(items.length - 1); return; }
        if ((event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') && open && active >= 0 && items[active]) {
          event.preventDefault();
          choose(items[active].path);
        }
      }

      var menu = null;
      if (open && box) {
        menu = h('div', {
          className: 'wr-pop',
          ref: popRef,
          role: 'listbox',
          style: {
            left: box.left + 'px',
            width: box.width + 'px',
            maxHeight: box.maxHeight + 'px',
            top: box.top === null ? 'auto' : box.top + 'px',
            bottom: box.bottom === null ? 'auto' : box.bottom + 'px',
          },
        },
          items.length === 0
            ? h('div', { className: 'wr-opt-empty' }, t('workspaceEmpty'))
            : items.map(function (item, position) {
              return h('button', {
                key: item.id || item.path,
                type: 'button',
                className: 'wr-opt',
                role: 'option',
                'aria-selected': samePath(item.path, props.value) ? 'true' : 'false',
                'data-active': position === active ? 'true' : 'false',
                onMouseEnter: function () { setActive(position); },
                onClick: function () { choose(item.path); },
              },
                h('div', { className: 'wr-opt-title' }, item.title),
                h('div', { className: 'wr-opt-path' }, item.path),
              );
            }),
        );
      }

      return h('div', { style: { position: 'relative', display: 'flex', minWidth: 0 } },
        h('button', {
          ref: buttonRef,
          type: 'button',
          className: 'wr-control',
          disabled: props.disabled || items.length === 0,
          'aria-haspopup': 'listbox',
          'aria-expanded': open ? 'true' : 'false',
          'aria-label': t('workspace'),
          title: props.value || '',
          onClick: function () { if (open) close(); else setOpen(true); },
          onKeyDown: onKeyDown,
        },
          h('span', { className: 'wr-control-label' }, label),
          chevron(open),
        ),
        menu,
      );
    }

    /**
     * 把规则文件拆成「前言 + 条目 + 尾注」。
     *
     * 只认顶格的 `- ` / `* ` / `+ ` 三种标记。这不是解析器偷懒，是为了保真：
     * 一旦出现嵌套列表、列表项的缩进续行、或列表区里的代码块，就返回
     * ok:false 让界面退回文本编辑。猜错一次的代价是把用户手写的结构改坏，
     * 而这类文件本来也不适合一次一行地填。
     *
     * 往返保真：对 ok:true 的结果执行 serializeRules 应能还原原文（空行位置也保留）。
     * @param {string} text - 文件原文。
     * @returns {object} 解析结果。
     */
    function parseRules(text) {
      var source = typeof text === 'string' ? text : '';
      if (source.trim() === '') return { ok: true, preamble: '', preambleLines: [], items: [], tail: '', tailLines: [], trailingNewline: false };

      var lines = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      var trailingNewline = false;
      if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
        trailingNewline = true;
      }

      var preamble = [];
      var items = [];
      var tail = [];
      var phase = 'preamble';
      var fence = null;
      var current = null;

      for (var index = 0; index < lines.length; index += 1) {
        var line = lines[index];
        var trimmed = line.trim();

        if (fence) {
          if (trimmed.length >= 3 && trimmed.charAt(0) === fence && /^(`{3,}|~{3,})$/.test(trimmed)) fence = null;
          // 进入围栏时 phase 已经离开 items，这里只是防御：宁可多一行尾注，也不要吞掉原文。
          if (phase === 'items') phase = 'tail';
          (phase === 'preamble' ? preamble : tail).push(line);
          continue;
        }

        var opening = /^(`{3,}|~{3,})/.exec(trimmed);
        if (opening) {
          // 列表区里出现代码块，说明列表到此结束；围栏内的 `- ` 不能再被当成条目。
          if (phase === 'items') phase = 'tail';
          fence = opening[1].charAt(0);
          (phase === 'preamble' ? preamble : tail).push(line);
          continue;
        }

        if (trimmed === '') {
          if (phase === 'items') current.blankAfter += 1;
          else (phase === 'preamble' ? preamble : tail).push('');
          continue;
        }

        var listed = /^([-*+]) (.*)$/.exec(line);
        if (listed) {
          if (phase === 'tail') return { ok: false, reason: 'interleaved' };
          phase = 'items';
          current = { bullet: listed[1], text: listed[2], blankAfter: 0 };
          items.push(current);
          continue;
        }

        if (phase === 'items') {
          // 缩进行是某个条目的续行，单行填空装不下它；顶格的说明列表已经结束。
          if (/^\s/.test(line)) return { ok: false, reason: 'continuation' };
          phase = 'tail';
          current = null;
          tail.push(line);
          continue;
        }

        (phase === 'preamble' ? preamble : tail).push(line);
      }

      return {
        ok: true,
        // 同时给出按行保存的版本：只用拼好的字符串时，「只有一行空行」的前言会
        // 退化成空串，和「没有前言」无法区分，回写时就少一行。
        preamble: preamble.join('\n'),
        preambleLines: preamble,
        items: items,
        tail: tail.join('\n'),
        tailLines: tail,
        trailingNewline: trailingNewline,
      };
    }

    /**
     * 把「前言 + 条目 + 尾注」写回 Markdown。
     *
     * 空条目会被丢掉：界面允许先加一条再填内容，没填就保存不该在文件里留下 `- `。
     * 保留每个条目后面的空行数，这样「条目之间留了空行」的文件保存后不会变形。
     * @param {object} state - `{preamble, items, tail}`。
     * @returns {string} 文件内容。
     */
    function serializeRules(state) {
      // 优先用按行保存的前言/尾注；只有字符串时按行拆开，效果相同。
      var pre = Array.isArray(state.preambleLines)
        ? state.preambleLines
        : (typeof state.preamble === 'string' && state.preamble !== '' ? state.preamble.split('\n') : []);
      var post = Array.isArray(state.tailLines)
        ? state.tailLines
        : (typeof state.tail === 'string' && state.tail !== '' ? state.tail.split('\n') : []);
      var source = Array.isArray(state.items) ? state.items : [];

      var lines = pre.slice();
      var pending = 0;
      for (var index = 0; index < source.length; index += 1) {
        var item = source[index] || {};
        // 只把换行压成空格（输入框里不会有多行），行尾空格原样保留：
        // 抠掉它会让「打开就脏」，白白给用户一次没有意义的保存提示。
        var text = String(item.text == null ? '' : item.text).replace(/[\r\n]+/g, ' ');
        pending += Number(item.blankAfter) || 0;
        if (text.trim() === '') continue;
        lines.push(String(item.bullet || '-') + ' ' + text);
        for (var blank = 0; blank < pending; blank += 1) lines.push('');
        pending = 0;
      }
      // 末尾条目被清空时，它后面的空行仍要留在尾注之前，否则段落会贴到上一条规则底下。
      if (post.length > 0) {
        for (var rest = 0; rest < pending; rest += 1) lines.push('');
      }
      for (var after = 0; after < post.length; after += 1) lines.push(post[after]);

      var body = lines.join('\n');
      if (body === '') return '';
      // 新建文件补上结尾换行；原本没有结尾换行的文件保持原样，免得每次保存都多一个字节。
      return state.trailingNewline === false ? body : body + '\n';
    }

    /**
     * 设置分区主体。
     * @param {object} props - 宿主注入的 props。
     * @returns {object} React 元素。
     */
    function Section(props) {
      // 宿主为 settings.section 分组注入已绑定语言的 t。实测存在且为函数；
      // 不做兜底，契约一旦变化应该立刻暴露，而不是静默退化成显示 key 名。
      var t = props.t;

      var [workspaces, setWorkspaces] = useState({ available: null, items: [] });
      var [manual, setManual] = useState(false);
      var [dir, setDir] = useState('');
      var [dirDraft, setDirDraft] = useState('');
      var [rules, setRules] = useState(null);
      // 文本编辑模式下的原文；条目模式下它只作为「切回文本」时的底稿。
      var [content, setContent] = useState('');
      // 加载时的原文，用来算脏：改回去之后状态应该自己回到「没有未保存的修改」。
      var [baseContent, setBaseContent] = useState('');
      var [baseMtimeMs, setBaseMtimeMs] = useState(null);
      var [mode, setMode] = useState('items');
      // 写入目标：local 是本机私有（CLAUDE.local.md + exclude），sync 是进版本库（CLAUDE.md）。
      // 与上面的 mode（条目/文本编辑）不是一回事，两个词撞了但语义完全不同。
      var [target, setTarget] = useState('local');
      var [pending, setPending] = useState([]);
      var [preambleLines, setPreambleLines] = useState([]);
      var [tailLines, setTailLines] = useState([]);
      var [items, setItems] = useState([]);
      var [trailingNewline, setTrailingNewline] = useState(true);
      // 文件原本用 CRLF 就继续写 CRLF：内部一律按 LF 处理，只在收发的边界上转换。
      var [crlf, setCrlf] = useState(false);
      var [parseNote, setParseNote] = useState(null);
      var [focusId, setFocusId] = useState(null);
      var [busy, setBusy] = useState(false);
      var [error, setError] = useState(null);
      var [notice, setNotice] = useState(null);
      var [conflict, setConflict] = useState(null);
      var requestSeq = useRef(0);
      var itemSeq = useRef(0);
      var inputRefs = useRef({});
      // loadDir / save 都在异步回调里读目标，用 ref 才能拿到最新值而不是闭包快照。
      var targetRef = useRef('local');

      /**
       * 给解析出的条目配上稳定的 key：React 用下标当 key 会在删除中间项时串行错位。
       * @param {object} parsed - parseRules 的结果。
       * @returns {object[]} 带 id 的条目。
       */
      function withIds(parsed) {
        return parsed.items.map(function (item) {
          itemSeq.current += 1;
          return { id: 'i' + itemSeq.current, bullet: item.bullet, text: item.text, blankAfter: item.blankAfter };
        });
      }

      /**
       * 拉取某个目录的待确认候选。读不出来就当没有——它只是便利功能，
       * 不该让整个面板因为这个请求失败而报错。
       * @param {string} nextDir - 项目目录。
       */
      function refreshPending(nextDir) {
        if (!nextDir) {
          setPending([]);
          return;
        }
        callApi(API + '/pending?dir=' + encodeURIComponent(nextDir))
          .then(function (result) {
            setPending(result.ok && Array.isArray(result.body.items) ? result.body.items : []);
          })
          .catch(function () { setPending([]); });
      }

      var currentText = mode === 'items'
        ? serializeRules({ preambleLines: preambleLines, items: items, tailLines: tailLines, trailingNewline: trailingNewline })
        : content;
      var dirty = currentText !== baseContent;
      /** 内部用 LF；发出去之前按文件原来的换行习惯还原。 */
      var outboundText = crlf ? currentText.replace(/\n/g, '\r\n') : currentText;

      var loadDir = useCallback(function (nextDir, preserveNotice) {
        if (!nextDir) return;
        var seq = requestSeq.current + 1;
        requestSeq.current = seq;
        setBusy(true);
        setError(null);
        // 保存成功后会紧接着重读一次，那条「已保存」不该被自己的重读擦掉。
        if (!preserveNotice) setNotice(null);
        setConflict(null);
        callApi(API + '?dir=' + encodeURIComponent(nextDir) + '&mode=' + targetRef.current)
          .then(function (result) {
            if (requestSeq.current !== seq) return;
            if (!result.ok) {
              setError(t('errReadFailed') + ': ' + (result.body.error || result.status));
              setRules(null);
              return;
            }
            var body = result.body || {};
            refreshPending(nextDir);
            // 换行在内部统一成 LF，只在收发边界转换；混杂换行的文件按 LF 归一。
            var useCrlf = body.eol === 'crlf' && body.mixedEol !== true;
            var raw = typeof body.content === 'string' ? body.content : '';
            var text = raw.replace(/\r\n/g, '\n');
            var parsed = parseRules(text);
            setRules(body);
            setCrlf(useCrlf);
            setContent(text);
            setBaseContent(text);
            setBaseMtimeMs(typeof body.mtimeMs === 'number' ? body.mtimeMs : null);
            // 空文件从条目模式起步（用户第一次进来就该照着一行一行填）；
            // 非空但解析不出列表的，说明这份文件不是简单列表，直接交给文本编辑，
            // 否则一次保存就会把它重排成别的形状。
            if (parsed.ok && (parsed.items.length > 0 || text.trim() === '')) {
              setPreambleLines(parsed.preambleLines);
              setTailLines(parsed.tailLines);
              setItems(withIds(parsed));
              // 空文件没有「原有结尾换行」可言，按惯例补上；非空文件沿用磁盘上的真实情况。
              setTrailingNewline(text.trim() === '' ? true : parsed.trailingNewline !== false);
              setMode('items');
              setParseNote(null);
            } else {
              setPreambleLines([]);
              setTailLines([]);
              setItems([]);
              setMode('text');
              setParseNote(parsed.ok ? 'not-list' : parsed.reason);
            }
          })
          .catch(function (cause) {
            if (requestSeq.current !== seq) return;
            setError(t('errNetwork') + ': ' + String(cause && cause.message ? cause.message : cause));
          })
          .finally(function () {
            if (requestSeq.current === seq) setBusy(false);
          });
      }, [t]);

      // 首次挂载：拉工作区列表，并按最近使用排序后默认选中第一个。
      useEffect(function () {
        callApi(API + '/workspaces')
          .then(function (result) {
            if (!result.ok) {
              setWorkspaces({ available: false, items: [] });
              return;
            }
            var items = Array.isArray(result.body.workspaces) ? result.body.workspaces.slice() : [];
            items.sort(function (a, b) {
              var left = Date.parse(a.updatedAt || '') || 0;
              var right = Date.parse(b.updatedAt || '') || 0;
              return right - left;
            });
            setWorkspaces({ available: result.body.available !== false, items: items });
            if (items.length > 0) {
              setDir(items[0].path);
              loadDir(items[0].path);
            } else {
              setManual(true);
            }
          })
          .catch(function () {
            setWorkspaces({ available: false, items: [] });
            setManual(true);
          });
      }, [loadDir]);

      /**
       * 切换目录前守住未保存的修改。
       * @param {string} next - 目标目录。
       */
      function switchTo(next) {
        if (!next || next === dir) return;
        if (dirty && !window.confirm(t('unsavedSwitch'))) return;
        setDir(next);
        loadDir(next);
      }

      /**
       * 切换写入目标。
       *
       * 两个文件互不相干：local 靠 exclude 挡住提交，sync 靠进版本库让团队共享。
       * 切换后必须重读，因为读的是不同文件，内容、mtime、git 状态全都变了。
       * @param {'local' | 'sync'} next - 目标。
       */
      function switchTarget(next) {
        if (next === targetRef.current) return;
        if (dirty && !window.confirm(t('unsavedSwitch'))) return;
        targetRef.current = next;
        setTarget(next);
        loadDir(dir, false);
      }

      /**
       * 采纳一条候选：放进编辑器并标脏，不直接写盘。
       *
       * 用户点保存才落盘——候选是模型的判断，落盘前必须再过一遍人的眼睛。
       * @param {object} entry - 候选条目。
       */
      function adoptPending(entry) {
        if (mode !== 'items') {
          setError(t('adoptNeedsItems'));
          return;
        }
        itemSeq.current += 1;
        var fresh = { id: 'i' + itemSeq.current, bullet: '-', text: entry.text, blankAfter: 0 };
        setItems(function (previous) { return previous.concat([fresh]); });
        setError(null);
        setNotice(t('adopted'));
        dropPending(entry.id);
      }

      /**
       * 丢弃一条候选（本地立即消失，服务端失败也不回滚：留着也没用了）。
       * @param {string} id - 候选 id。
       */
      function dropPending(id) {
        setPending(function (previous) {
          return previous.filter(function (item) { return item.id !== id; });
        });
        if (!dir) return;
        callApi(API + '/pending', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ dir: dir, action: 'remove', id: id }),
        }).catch(function () { /* 下次加载时会以磁盘为准 */ });
      }

      /** 清空全部候选。 */
      function dismissPending() {
        if (pending.length === 0) return;
        if (!window.confirm(t('pendingClearConfirm'))) return;
        setPending([]);
        if (!dir) return;
        callApi(API + '/pending', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ dir: dir, action: 'clear' }),
        }).catch(function () { /* 同上 */ });
      }

      /**
       * 在条目模式与文本模式之间切换。
       *
       * 切到文本是逃生舱：结构复杂的文件（嵌套列表、代码块）本来就不该被
       * 一行一行的输入框改写。切回条目时重新解析，解析不了就留在文本模式并说明原因。
       * @param {string} next - 目标模式。
       */
      function switchMode(next) {
        if (next === mode) return;
        if (next === 'text') {
          setContent(currentText);
          setMode('text');
          setParseNote(null);
          return;
        }
        var parsed = parseRules(content);
        if (!(parsed.ok && (parsed.items.length > 0 || content.trim() === ''))) {
          setParseNote(parsed.ok ? 'not-list' : parsed.reason);
          return;
        }
        setPreambleLines(parsed.preambleLines);
        setTailLines(parsed.tailLines);
        setItems(withIds(parsed));
        setTrailingNewline(content.trim() === '' ? true : parsed.trailingNewline !== false);
        setMode('items');
        setParseNote(null);
      }

      /**
       * 改一条的内容。
       * @param {string} id - 条目 id。
       * @param {object} patch - 要覆盖的字段。
       */
      function updateItem(id, patch) {
        setItems(function (previous) {
          return previous.map(function (item) {
            return item.id === id ? Object.assign({}, item, patch) : item;
          });
        });
        setNotice(null);
      }

      /**
       * 在某条之后插入一条空条目并聚焦，实现「填一条按回车继续填下一条」。
       * @param {string | null} afterId - 锚定条目；为 null 表示追加到末尾。
       */
      function addItemAfter(afterId) {
        itemSeq.current += 1;
        var fresh = { id: 'i' + itemSeq.current, bullet: '-', text: '', blankAfter: 0 };
        setItems(function (previous) {
          if (!afterId) return previous.concat([fresh]);
          var at = -1;
          for (var index = 0; index < previous.length; index += 1) {
            if (previous[index].id === afterId) { at = index; break; }
          }
          if (at < 0) return previous.concat([fresh]);
          return previous.slice(0, at + 1).concat([fresh], previous.slice(at + 1));
        });
        setFocusId(fresh.id);
        setNotice(null);
      }

      /**
       * 删掉一条，并把焦点交给上一条，方便连续按退格清理。
       * @param {string} id - 条目 id。
       */
      function removeItem(id) {
        var at = -1;
        for (var index = 0; index < items.length; index += 1) {
          if (items[index].id === id) { at = index; break; }
        }
        if (at < 0) return;
        var previous = at > 0 ? items[at - 1] : null;
        setItems(items.filter(function (item) { return item.id !== id; }));
        if (previous) setFocusId(previous.id);
        setNotice(null);
      }

      /**
       * 上下调换顺序。顺序会影响注入时的排列，靠前的规则更容易被模型贯彻。
       * @param {number} index - 当前下标。
       * @param {number} delta - -1 上移，1 下移。
       */
      function moveItem(index, delta) {
        var target = index + delta;
        if (target < 0 || target >= items.length) return;
        var next = items.slice();
        var moved = next[index];
        next[index] = next[target];
        next[target] = moved;
        setItems(next);
        setFocusId(moved.id);
        setNotice(null);
      }

      // 新增或删除条目后把焦点交给刚操作的那一条，键盘流不会断。
      useEffect(function () {
        if (!focusId) return;
        var node = inputRefs.current[focusId];
        if (node) node.focus();
        setFocusId(null);
      });

      /**
       * 保存当前编辑内容。
       * @param {number | null} base - 作为乐观锁基准的 mtime。
       */
      function save(base) {
        if (!dir) return;
        setBusy(true);
        setError(null);
        setNotice(null);
        setConflict(null);
        callApi(API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            dir: dir,
            content: outboundText,
            baseMtimeMs: base,
            mode: targetRef.current,
          }),
        })
          .then(function (result) {
            if (result.ok) {
              setNotice(t('saved'));
              var nextBase = typeof result.body.mtimeMs === 'number' ? result.body.mtimeMs : null;
              setBaseMtimeMs(nextBase);
              // 保存后重新读一次，让诊断信息（加载链 / git / 生效状态）跟上磁盘。
              loadDir(dir, true);
              return;
            }
            if (result.status === 409 && result.body.error === 'conflict') {
              setConflict({
                currentMtimeMs: typeof result.body.currentMtimeMs === 'number' ? result.body.currentMtimeMs : null,
                reason: result.body.reason,
              });
              return;
            }
            if (result.status === 409 && result.body.error === 'exclude-failed') {
              setError(t('errExcludeFailed'));
              return;
            }
            if (result.status === 409 && result.body.error === 'tracked') {
              setError(t('errTracked'));
              return;
            }
            setError(t('errSaveFailed') + ': ' + (result.body.error || result.status));
          })
          .catch(function (cause) {
            setError(t('errNetwork') + ': ' + String(cause && cause.message ? cause.message : cause));
          })
          .finally(function () { setBusy(false); });
      }

      var canSave = Boolean(dir) && dirty && !busy;

      // 工作区行：左边是标题 + 说明，右边是控件，对齐宿主设置项的排版。
      var workspaceControls = manual
        ? h('button', {
          className: 'wr-control',
          disabled: workspaces.items.length === 0,
          onClick: function () { setManual(false); },
        }, t('manualHide'))
        : [
          h(Picker, {
            key: 'picker',
            t: t,
            items: workspaces.items,
            value: dir,
            disabled: busy,
            onChange: switchTo,
          }),
          h('button', {
            key: 'manual',
            className: 'wr-control',
            onClick: function () { setManual(true); setDirDraft(dir); },
          }, t('manualToggle')),
        ];

      var workspaceRow = h('div', null,
        h('div', { className: 'wr-row' },
          h('div', { className: 'wr-row-text' },
            h('div', { className: 'wr-row-title' }, t('workspace')),
            h('div', { className: 'wr-row-desc' },
              manual
                ? t('manualLabel')
                : (workspaces.available === false ? t('workspaceUnavailable') : t('workspaceDesc'))),
          ),
          h('div', { className: 'wr-row-control' }, workspaceControls),
        ),
        manual
          ? h('div', { className: 'wr-field' },
            h('input', {
              className: 'wr-input',
              value: dirDraft,
              placeholder: t('manualPlaceholder'),
              spellCheck: false,
              onChange: function (event) { setDirDraft(event.target.value); },
              onKeyDown: function (event) {
                if (event.key === 'Enter' && dirDraft.trim()) switchTo(dirDraft.trim());
              },
            }),
            h('button', {
              className: 'wr-control wr-primary',
              disabled: busy || !dirDraft.trim(),
              onClick: function () { switchTo(dirDraft.trim()); },
            }, t('load')),
          )
          : null,
      );

      // 写入目标行：开关放在宿主的「左标题说明、右控件」节奏里。
      var targetRow = h('div', { className: 'wr-row' },
        h('div', { className: 'wr-row-text' },
          h('div', { className: 'wr-row-title' }, t('targetLabel')),
          h('div', { className: 'wr-row-desc' },
            target === 'sync' ? t('targetSyncDesc') : t('targetLocalDesc')),
        ),
        h('div', { className: 'wr-row-control' },
          h('button', {
            type: 'button',
            className: 'wr-switch' + (target === 'sync' ? ' wr-switch-on' : ''),
            role: 'switch',
            'aria-checked': target === 'sync' ? 'true' : 'false',
            'aria-label': t('targetToggle'),
            title: t('targetToggle'),
            disabled: busy || !dir,
            onClick: function () { switchTarget(target === 'sync' ? 'local' : 'sync'); },
          }, h('span', { className: 'wr-switch-knob' })),
        ),
      );

      // 两份规则会一起被加载器读进来，这个事实用户几乎不可能自己发现。
      var siblingNote = rules && rules.sibling && rules.sibling.exists
        ? h('div', { className: 'wr-note wr-note-warn' },
          t('targetSibling').replace('{file}', rules.sibling.name))
        : null;

      var pendingBlock = pending.length > 0
        ? h('div', { className: 'wr-pending' },
          h('div', { className: 'wr-pending-head' },
            h('div', { className: 'wr-row-title' }, t('pendingTitle') + ' (' + pending.length + ')'),
            h('button', {
              type: 'button',
              className: 'wr-link',
              onClick: dismissPending,
            }, t('pendingClear')),
          ),
          h('div', { className: 'wr-row-desc' }, t('pendingDesc')),
          pending.map(function (entry) {
            return h('div', { key: entry.id, className: 'wr-pending-item' },
              h('div', { className: 'wr-pending-text' }, entry.text),
              h('div', { className: 'wr-pending-actions' },
                h('button', {
                  type: 'button',
                  className: 'wr-control wr-primary wr-small',
                  disabled: busy || mode !== 'items',
                  title: mode !== 'items' ? t('adoptNeedsItems') : '',
                  onClick: function () { adoptPending(entry); },
                }, t('pendingAdopt')),
                h('button', {
                  type: 'button',
                  className: 'wr-control wr-small',
                  onClick: function () { dropPending(entry.id); },
                }, t('pendingDismiss')),
              ),
            );
          }),
        )
        : null;

      var meta = null;
      if (rules) {
        var parts = [
          h('span', { key: 'path', style: { opacity: 0.8 } }, rules.path),
        ];
        if (rules.exists) {
          parts.push(h('span', { key: 'size' }, formatBytes(rules.sizeBytes)));
          parts.push(h('span', { key: 'mtime' }, formatTime(rules.mtimeMs)));
        } else {
          parts.push(h('span', { key: 'none' }, t('empty')));
        }
        meta = h('div', { className: 'wr-meta' }, parts.reduce(function (acc, node, index) {
          if (index > 0) acc.push(h('span', { key: 'sep' + index, className: 'wr-meta-sep' }, '·'));
          acc.push(node);
          return acc;
        }, []));
      }

      var warnings = [];
      if (rules) {
        if (rules.mixedEol) warnings.push({ key: 'mixed', text: t('eolMixed') });
        else if (rules.eol === 'crlf') warnings.push({ key: 'crlf', text: t('eolCrlf') });
        if (rules.bom) warnings.push({ key: 'bom', text: t('bomPresent') });
        if (rules.overLimit) warnings.push({ key: 'limit', text: t('overLimit') });
        if (rules.truncated) warnings.push({ key: 'trunc', text: t('truncated') });
        if (rules.git && rules.git.kind === 'none') warnings.push({ key: 'gitnone', text: t('diagGitNone') });
        // 两种模式的「危险方向」正好相反：本机私有怕没被忽略，同步怕被忽略。
        if (rules.git && rules.git.kind !== 'none') {
          if (target === 'local' && rules.git.excluded === false) {
            warnings.push({ key: 'gitopen', text: t('diagGitNotExcluded') });
          }
          if (target === 'sync' && rules.git.excluded === true) {
            warnings.push({ key: 'syngignored', text: t('diagSyncIgnored') });
          }
        }
        // 已追踪在两种模式下含义相反：本机私有是硬错误（保存会被拒），同步是预期状态。
        if (target === 'local' && rules.git && rules.git.tracked === true) {
          warnings.push({ key: 'gittracked', text: t('diagGitTracked') });
        }
        var status = rules.status || {};
        if (status.checked && status.session && status.session.matchesDisk === false) {
          warnings.push({ key: 'stale', text: t('diagStatusStale') });
        }
      }

      var statusLine = '';
      if (rules && rules.status) {
        var st = rules.status;
        var session = st.session;
        if (st.checked && session && session.complete === false) statusLine = t('diagStatusPartial');
        else if (st.checked) {
          if (session && session.matchesDisk === true) statusLine = t('diagStatusLoaded');
          else if (session && session.matchesDisk === false) statusLine = t('diagStatusStale');
          else statusLine = t('diagStatusNotListed');
        } else if (st.reason === 'no-workspace') statusLine = t('diagStatusNoWorkspace');
        else if (st.reason === 'no-session') statusLine = t('diagStatusNoSession');
        else if (st.reason === 'services-unavailable') statusLine = t('diagStatusUnavailable');
        else statusLine = t('diagStatusUnknown');
      }

      var diag = null;
      if (rules) {
        var rows = [];
        if (statusLine) rows.push(h('div', { key: 'status' }, statusLine));
        if (rules.status && rules.status.session && rules.status.session.id) {
          rows.push(h('div', { key: 'session' }, t('diagStatusSession') + ' ' + rules.status.session.id));
          // 状态取自更早的会话时必须说清楚，否则用户会以为这是刚建的那个会话的结论。
          if (rules.status.session.skipped > 0) {
            rows.push(h('div', { key: 'skipped' }, t('diagStatusSkipped')));
          }
        }
        if (rules.chain && rules.chain.length > 0) {
          rows.push(h('div', { key: 'chain' }, t('diagChain')));
          rules.chain.forEach(function (level, index) {
            rows.push(h('div', { key: 'lvl' + index, className: 'wr-diag-level' },
              level.dir + ' → ' + level.files.map(function (file) { return file.name; }).join(', ')));
          });
        }
        if (rules.git && rules.git.excludePath && target === 'local') {
          rows.push(h('div', { key: 'git' },
            (rules.git.excluded ? t('diagGitExcluded') : t('diagGitNotExcluded')) + ' ' + rules.git.excludePath));
        }
        if (target === 'sync') {
          rows.push(h('div', { key: 'sync' }, t('diagSyncTarget')));
        }
        diag = h('details', { className: 'wr-diag' },
          h('summary', null, t('diag')),
          h('div', { className: 'wr-diag-body' }, rows),
        );
      }

      var editorBody;
      if (mode === 'items') {
        var itemRows = items.map(function (item, index) {
          return h('div', { key: item.id, className: 'wr-item' },
            h('span', { className: 'wr-item-no', 'aria-hidden': 'true' }, String(index + 1)),
            h('input', {
              className: 'wr-item-input',
              value: item.text,
              placeholder: t('itemPlaceholder'),
              spellCheck: false,
              title: item.text,
              'aria-label': t('itemLabel') + ' ' + String(index + 1),
              ref: function (node) {
                if (node) inputRefs.current[item.id] = node;
                else delete inputRefs.current[item.id];
              },
              onChange: function (event) { updateItem(item.id, { text: event.target.value }); },
              onKeyDown: function (event) {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addItemAfter(item.id);
                } else if (event.key === 'Backspace' && item.text === '') {
                  // 空条目上按退格等于删掉这一行，连续按就能一路收回去。
                  event.preventDefault();
                  removeItem(item.id);
                }
              },
            }),
            h('button', {
              type: 'button',
              className: 'wr-icon',
              title: t('moveUp'),
              'aria-label': t('moveUp'),
              disabled: index === 0,
              onClick: function () { moveItem(index, -1); },
            }, '↑'),
            h('button', {
              type: 'button',
              className: 'wr-icon',
              title: t('moveDown'),
              'aria-label': t('moveDown'),
              disabled: index === items.length - 1,
              onClick: function () { moveItem(index, 1); },
            }, '↓'),
            h('button', {
              type: 'button',
              className: 'wr-icon wr-icon-danger',
              title: t('remove'),
              'aria-label': t('remove'),
              onClick: function () { removeItem(item.id); },
            }, '×'),
          );
        });

        editorBody = h('div', { className: 'wr-items' },
          items.length === 0
            ? h('div', { className: 'wr-empty' }, t('itemsEmpty'))
            : itemRows,
          h('button', {
            type: 'button',
            className: 'wr-add',
            onClick: function () { addItemAfter(null); },
          }, t('itemAdd')),
        );
      } else {
        editorBody = h('textarea', {
          id: 'wr-editor',
          className: 'wr-editor',
          value: content,
          spellCheck: false,
          placeholder: t('editorPlaceholder'),
          onChange: function (event) {
            setContent(event.target.value);
            setNotice(null);
          },
        });
      }

      var editorBlock = h('div', { className: 'wr-editor-wrap' },
        h('div', { className: 'wr-editor-head' },
          h('div', { className: 'wr-row-title' }, t('editorLabel')),
          h('button', {
            type: 'button',
            className: 'wr-link',
            onClick: function () { switchMode(mode === 'items' ? 'text' : 'items'); },
          }, mode === 'items' ? t('modeText') : t('modeItems')),
        ),
        meta,
        parseNote
          ? h('div', { className: 'wr-note wr-note-warn' },
            t(parseNote === 'not-list' ? 'parseNotList' : 'parseComplex'))
          : null,
        editorBody,
        mode === 'items' && preambleLines.join('\n').trim() !== ''
          ? h('div', { className: 'wr-meta' }, t('preambleKept'))
          : null,
      );

      return h('div', { className: 'wr-root' },
        h('h3', { className: 'wr-title' }, t('heading')),
        h('p', { className: 'wr-intro' }, t('intro')),
        error ? h('div', { className: 'wr-note wr-note-error' }, error) : null,
        conflict
          ? h('div', { className: 'wr-note wr-note-warn' },
            h('div', null, t('conflict')),
            h('div', { className: 'wr-note-actions' },
              h('button', {
                className: 'wr-control wr-primary',
                onClick: function () {
                  var fresh = conflict.currentMtimeMs;
                  setConflict(null);
                  save(fresh);
                },
              }, t('conflictOverwrite')),
              h('button', {
                className: 'wr-control',
                onClick: function () {
                  setConflict(null);
                  loadDir(dir);
                },
              }, t('conflictDiscard')),
            ),
          )
          : null,
        workspaceRow,
        targetRow,
        siblingNote,
        pendingBlock,
        editorBlock,
        warnings.map(function (warning) { return h('div', { key: warning.key, className: 'wr-note wr-note-warn' }, warning.text); }),
        h('div', { className: 'wr-actions' },
          h('button', {
            className: 'wr-control wr-primary',
            disabled: !canSave,
            onClick: function () { save(baseMtimeMs); },
          }, busy ? t('saving') : t('save')),
          dirty ? h('span', { className: 'wr-status' }, t('dirty')) : null,
          notice ? h('span', { className: 'wr-status' }, notice) : null,
          busy && !dirty ? h('span', { className: 'wr-status' }, t('loading')) : null,
        ),
        diag,
      );
    }

    function apply(ctx) {
      ensureStyles();
      ctx.effect(() => ctx.locale.register(NS, DICTS), 'workspace-rules: dictionaries');
      var t = ctx.locale.bind(NS);
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'workspace-rules',
        order: 30,
        locale: NS,
        label: () => t('label'),
      }, Section));
    }

    exports.name = NS;
    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  },
});
