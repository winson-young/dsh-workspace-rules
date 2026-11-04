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

    var S = {
      row: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' },
      label: { fontSize: '12px', opacity: 0.7, minWidth: '56px' },
      select: { flex: '1 1 320px', minWidth: '220px', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(127,127,127,0.4)', background: 'transparent', color: 'inherit', font: 'inherit' },
      input: { flex: '1 1 320px', minWidth: '220px', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(127,127,127,0.4)', background: 'transparent', color: 'inherit', font: 'inherit' },
      button: { padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(127,127,127,0.4)', background: 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit' },
      buttonPrimary: { padding: '6px 14px', borderRadius: '6px', border: '1px solid transparent', background: 'rgba(80,140,255,0.9)', color: '#fff', cursor: 'pointer', font: 'inherit' },
      textarea: { width: '100%', minHeight: '260px', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(127,127,127,0.4)', background: 'transparent', color: 'inherit', font: 'inherit', fontSize: '13px', lineHeight: 1.6, resize: 'vertical' },
      hint: { fontSize: '12px', opacity: 0.65, margin: '4px 0 0' },
      warn: { fontSize: '12px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(230,160,40,0.14)', border: '1px solid rgba(230,160,40,0.35)', margin: '8px 0 0' },
      error: { fontSize: '12px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(230,80,80,0.14)', border: '1px solid rgba(230,80,80,0.35)', margin: '8px 0 0' },
      ok: { fontSize: '12px', opacity: 0.7 },
      details: { marginTop: '14px', fontSize: '12px', opacity: 0.8 },
      mono: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', wordBreak: 'break-all' },
    };

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

      var workspaceRow = manual
        ? h('div', { style: S.row },
          h('span', { style: S.label }, t('manualLabel')),
          h('input', {
            style: S.input,
            value: dirDraft,
            placeholder: t('manualPlaceholder'),
            spellCheck: false,
            onChange: function (event) { setDirDraft(event.target.value); },
            onKeyDown: function (event) {
              if (event.key === 'Enter' && dirDraft.trim()) switchTo(dirDraft.trim());
            },
          }),
          h('button', {
            style: S.button,
            disabled: busy || !dirDraft.trim(),
            onClick: function () { switchTo(dirDraft.trim()); },
          }, t('load')),
          workspaces.items.length > 0
            ? h('button', { style: S.button, onClick: function () { setManual(false); } }, t('manualHide'))
            : null,
        )
        : h('div', { style: S.row },
          h('span', { style: S.label }, t('workspace')),
          h('select', {
            style: S.select,
            value: dir,
            disabled: busy,
            onChange: function (event) { switchTo(event.target.value); },
          },
            workspaces.items.length === 0
              ? h('option', { value: '' }, workspaces.available === false ? t('workspaceUnavailable') : t('workspaceEmpty'))
              : workspaces.items.map(function (item) {
                return h('option', { key: item.id, value: item.path }, item.title + ' — ' + item.path);
              }),
          ),
          h('button', { style: S.button, onClick: function () { setManual(true); setDirDraft(dir); } }, t('manualToggle')),
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
        meta = h('div', { style: Object.assign({}, S.hint, S.mono) }, parts.reduce(function (acc, node, index) {
          if (index > 0) acc.push(h('span', { key: 'sep' + index, style: { opacity: 0.35 } }, '  ·  '));
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
        if (statusLine) rows.push(h('div', { key: 'status' }, t('diag') + ': ' + statusLine));
        if (rules.status && rules.status.session && rules.status.session.id) {
          rows.push(h('div', { key: 'session', style: S.mono }, t('diagStatusSession') + ': ' + rules.status.session.id));
          // 状态取自更早的会话时必须说清楚，否则用户会以为这是刚建的那个会话的结论。
          if (rules.status.session.skipped > 0) {
            rows.push(h('div', { key: 'skipped' }, t('diagStatusSkipped')));
          }
        }
        if (rules.chain && rules.chain.length > 0) {
          rows.push(h('div', { key: 'chain' }, t('diagChain') + ':'));
          rules.chain.forEach(function (level, index) {
            rows.push(h('div', { key: 'lvl' + index, style: Object.assign({ paddingLeft: '12px' }, S.mono) },
              level.dir + ' → ' + level.files.map(function (file) { return file.name; }).join(', ')));
          });
        }
        if (rules.git && rules.git.excludePath) {
          rows.push(h('div', { key: 'git', style: S.mono },
            (rules.git.excluded ? t('diagGitExcluded') : t('diagGitNotExcluded')) + ' — ' + rules.git.excludePath));
        }
        diag = h('details', { style: S.details }, h('summary', { style: { cursor: 'pointer' } }, t('diag')), rows);
      }

      return h('div', { style: { maxWidth: '760px' } },
        h('h3', { style: { margin: '0 0 4px', fontSize: '15px' } }, t('heading')),
        h('p', { style: { margin: '0 0 16px', fontSize: '13px', opacity: 0.72, lineHeight: 1.6 } }, t('intro')),
        workspaceRow,
        error ? h('div', { style: S.error }, error) : null,
        conflict
          ? h('div', { style: S.warn },
            h('div', { style: { marginBottom: '8px' } }, t('conflict')),
            h('div', { style: { display: 'flex', gap: '8px' } },
              h('button', {
                style: S.buttonPrimary,
                onClick: function () {
                  var fresh = conflict.currentMtimeMs;
                  setConflict(null);
                  save(fresh);
                },
              }, t('conflictOverwrite')),
              h('button', {
                style: S.button,
                onClick: function () {
                  setConflict(null);
                  loadDir(dir);
                },
              }, t('conflictDiscard')),
            ),
          )
          : null,
        meta,
        h('label', { style: Object.assign({}, S.label, { display: 'block', margin: '12px 0 4px' }) }, t('editorLabel')),
        h('textarea', {
          style: S.textarea,
          value: content,
          spellCheck: false,
          placeholder: t('editorPlaceholder'),
          onChange: function (event) {
            setContent(event.target.value);
            setDirty(true);
            setNotice(null);
          },
        }),
        warnings.map(function (warning) { return h('div', { key: warning.key, style: S.warn }, warning.text); }),
        h('div', { style: Object.assign({}, S.row, { marginTop: '12px' }) },
          h('button', {
            style: S.buttonPrimary,
            disabled: !canSave,
            onClick: function () { save(baseMtimeMs); },
          }, busy ? t('saving') : t('save')),
          dirty ? h('span', { style: S.ok }, t('dirty')) : null,
          notice ? h('span', { style: S.ok }, notice) : null,
          busy && !dirty ? h('span', { style: S.ok }, t('loading')) : null,
        ),
        diag,
      );
    }

    function apply(ctx) {
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
