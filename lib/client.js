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
        heading: '项目私有指令',
        intro: '只保存在本机的项目约定。由 DSH 内置指令加载器直接读取，新会话一定拿到最新内容。',
        workspace: '工作区',
        workspaceDesc: '只写入所选目录下的 CLAUDE.local.md，子目录不受影响',
        workspaceEmpty: '还没有注册过工作区',
        workspaceUnavailable: '当前宿主没有提供工作区列表，请手动填写目录',
        manualToggle: '手动填写目录',
        manualHide: '使用工作区列表',
        manualLabel: '目录绝对路径',
        manualPlaceholder: 'D:\\Projects\\my-project',
        load: '读取',
        loading: '读取中…',
        editorLabel: '规则内容（Markdown）',
        editorPlaceholder: '例如：\n\n- 提交前先跑 pnpm test\n- 不要引入新的运行时依赖\n- 所有 SQL 收敛在 model 层',
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
        errReadFailed: '读取失败',
        errSaveFailed: '保存失败',
        errExcludeFailed: '无法写入 .git/info/exclude，已取消保存，避免留下一份未被忽略的本机规则',
        errTracked: '这个文件已经在版本库索引里，忽略规则无效。请先执行 git rm --cached CLAUDE.local.md，再保存。',
        errNetwork: '无法连接到宿主',
      },
      en: {
        label: 'Workspace Rules',
        heading: 'Project-private instructions',
        intro: 'Project conventions kept on this machine only. Read directly by the built-in DSH instruction loader; a new session always picks up the latest content.',
        workspace: 'Workspace',
        workspaceDesc: 'Only the CLAUDE.local.md inside the selected directory is written; subdirectories are unaffected',
        workspaceEmpty: 'No workspace registered yet',
        workspaceUnavailable: 'This host exposes no workspace list; type a directory instead',
        manualToggle: 'Type a directory',
        manualHide: 'Use the workspace list',
        manualLabel: 'Absolute directory path',
        manualPlaceholder: 'D:\\Projects\\my-project',
        load: 'Load',
        loading: 'Loading…',
        editorLabel: 'Rules (Markdown)',
        editorPlaceholder: 'For example:\n\n- Run pnpm test before committing\n- Do not add runtime dependencies\n- Keep all SQL in the model layer',
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

      '.wr-meta{margin:6px 0 0;font-size:12px;line-height:18px;color:light-dark(#81858c,#adb2b8);font-family:var(--dsh-font-family-code-default,ui-monospace,SFMono-Regular,Menlo,monospace);word-break:break-all}',
      '.wr-meta-sep{margin:0 6px;opacity:.5}',
      '.wr-actions{display:flex;align-items:center;gap:12px;padding:16px 0 0}',
      '.wr-status{font-size:12px;line-height:18px;color:light-dark(#81858c,#adb2b8)}',

      '.wr-note{margin-top:10px;padding:10px 12px;border-radius:12px;font-size:12px;line-height:18px}',
      '.wr-note-warn{background:light-dark(#fff7e6,#33291a);color:light-dark(#7a5b16,#ecc97e)}',
      '.wr-note-error{background:light-dark(#fdeeee,#351f1f);color:light-dark(#8f2f2f,#f0a5a5)}',
      '.wr-note-actions{display:flex;gap:8px;margin-top:10px}',

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
      var [content, setContent] = useState('');
      var [baseMtimeMs, setBaseMtimeMs] = useState(null);
      var [dirty, setDirty] = useState(false);
      var [busy, setBusy] = useState(false);
      var [error, setError] = useState(null);
      var [notice, setNotice] = useState(null);
      var [conflict, setConflict] = useState(null);
      var requestSeq = useRef(0);

      var loadDir = useCallback(function (target) {
        if (!target) return;
        var seq = requestSeq.current + 1;
        requestSeq.current = seq;
        setBusy(true);
        setError(null);
        setNotice(null);
        setConflict(null);
        callApi(API + '?dir=' + encodeURIComponent(target))
          .then(function (result) {
            if (requestSeq.current !== seq) return;
            if (!result.ok) {
              setError(t('errReadFailed') + ': ' + (result.body.error || result.status));
              setRules(null);
              return;
            }
            setRules(result.body);
            setContent(result.body.content || '');
            setBaseMtimeMs(typeof result.body.mtimeMs === 'number' ? result.body.mtimeMs : null);
            setDirty(false);
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
          body: JSON.stringify({ dir: dir, content: content, baseMtimeMs: base }),
        })
          .then(function (result) {
            if (result.ok) {
              setNotice(t('saved'));
              setDirty(false);
              var nextBase = typeof result.body.mtimeMs === 'number' ? result.body.mtimeMs : null;
              setBaseMtimeMs(nextBase);
              // 保存后重新读一次，让诊断信息（加载链 / git / 生效状态）跟上磁盘。
              loadDir(dir);
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
        if (rules.git && rules.git.kind !== 'none' && rules.git.excluded === false) {
          warnings.push({ key: 'gitopen', text: t('diagGitNotExcluded') });
        }
        // 已追踪是比「没被忽略」更硬的问题：ignore 对它无效，保存会被宿主拒绝。
        if (rules.git && rules.git.tracked === true) {
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
        if (rules.git && rules.git.excludePath) {
          rows.push(h('div', { key: 'git' },
            (rules.git.excluded ? t('diagGitExcluded') : t('diagGitNotExcluded')) + ' ' + rules.git.excludePath));
        }
        diag = h('details', { className: 'wr-diag' },
          h('summary', null, t('diag')),
          h('div', { className: 'wr-diag-body' }, rows),
        );
      }

      var editorBlock = h('div', { className: 'wr-editor-wrap' },
        h('label', { className: 'wr-row-title', htmlFor: 'wr-editor' }, t('editorLabel')),
        meta,
        h('textarea', {
          id: 'wr-editor',
          className: 'wr-editor',
          value: content,
          spellCheck: false,
          placeholder: t('editorPlaceholder'),
          onChange: function (event) {
            setContent(event.target.value);
            setDirty(true);
            setNotice(null);
          },
        }),
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
