<div align="center">

<img src="https://raw.githubusercontent.com/winson-young/dsh-workspace-rules/main/icon.svg" width="88" height="88" alt="dsh-workspace-rules">

# dsh-workspace-rules

**One private rulebook per project, loaded automatically in every new session.**

[简体中文](README.md) | English

[![npm version](https://img.shields.io/npm/v/dsh-workspace-rules?style=flat-square&label=npm&color=cb3837)](https://www.npmjs.com/package/dsh-workspace-rules)
[![npm downloads](https://img.shields.io/npm/dm/dsh-workspace-rules?style=flat-square&label=downloads%2Fmonth&color=1F883D)](https://www.npmjs.com/package/dsh-workspace-rules)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.1--rc.5-6366f1?style=flat-square)](#compatibility)
[![node](https://img.shields.io/badge/node-%3E%3D20-339933?style=flat-square)](#development)
[![dependencies](https://img.shields.io/badge/runtime%20deps-0-brightgreen?style=flat-square)](#development)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

</div>

[Highlights](#highlights) · [Install](#install) · [Usage](#usage) · [How it works](#how-it-works) · [Limitations](#limitations) · [Compatibility](#compatibility) · [Development](#development) · [Changelog](CHANGELOG.md)

---

"Don't add pointless type casts." "Keep every SQL statement inside the model layer." — you say this once per session, in every project.

This plugin turns those lines into **one file inside the project**, loaded automatically by every new session — plus a settings panel so you never have to open an editor.

## Highlights

| | |
|---|---|
| **Injection is not its job** | Rules are loaded by DSH's built-in `dsh-agent-instructions` from `<project>/CLAUDE.local.md`. The plugin only reads and writes that file — **if the plugin breaks, your rules still work** |
| **Isolated per workspace** | Rules from project A never leak into project B. The file lives in the project, so isolation is structural |
| **Invisible to teammates** | `CLAUDE.local.md` is a local-only convention; paired with `.git/info/exclude` it never enters version control, so a teammate's Cursor / Codex / [CC] sees no trace of it |
| **Git leak protection** | `.git/info/exclude` is repaired on save; if the file is already tracked by the index the save is refused with a `git rm --cached` hint. Handles submodules and worktrees |
| **Honest load status** | The panel tells you whether the session actually read *this* version of the file, by comparing the real `digest` recorded in the session — not by guessing |
| **One rule per field** | No Markdown by hand. Each rule gets its own input, <kbd>Enter</kbd> starts the next one, `↑` `↓` reorder, `×` deletes; the heading at the top and any trailing prose are preserved as-is |
| **Zero deps, zero build** | Source is the artifact. No bundler, no `node_modules`, works the moment it is installed |

## Install

```bash
dsh plugin --profile web add dsh-workspace-rules
```

Replace `web` with the profile you want. Restart DSH afterwards; a **Workspace rules** section appears in Settings.

> Profiles are separate environments. The desktop app is managed exclusively by Electron, so the CLI cannot install into the `desktop` profile.

From the GitHub source (newest commit, possibly ahead of npm):

```bash
dsh plugin --profile web add github:winson-young/dsh-workspace-rules
```

During development, link local sources:

```bash
dsh plugin --profile web add link:D:/Projects/dsh-workspace-rules
```

Use `link:`, not `file:` — `file:` **copies** the package, so later edits silently never take effect.

## Usage

1. Open **Settings → Workspace rules**
2. Pick or type a workspace directory
3. Fill in one rule per field
4. Save

Each rule gets its own input. Press <kbd>Enter</kbd> on any row to open a new one below it and focus it; `↑` `↓` reorder, `×` deletes. Empty rows are dropped on save, so drafting a row and filling it later never leaves a bare `- ` in the file.

No Markdown knowledge needed. What gets written is still plain Markdown:

```markdown
# Conventions

- No pointless type casts
- Keep every SQL statement in the model layer; never build SQL in services or handlers
- Check the existing implementation before adding a new one
```

Two exceptions:

- **Headings, prose paragraphs and code blocks** are not shown in the rule editor and are preserved byte-for-byte on save. To change them, use **Edit Markdown directly** on the right of the heading row.
- When the file is more complex than a flat list (nested lists, `##` groups between rules, indented continuation lines), the panel **switches to the text editor and says why** instead of guessing at a rewrite. The rule editor is unavailable for such files.

After saving:

- **New sessions** read the latest content on their first step
- **The current session** may keep following the old content — the workspace layer hot-reloads, but **instructions already in context are not retracted**. So you don't have to start a new chat, and you shouldn't expect old rules to vanish immediately either

The diagnostics section at the bottom of the panel shows: load status, which session it was taken from, the instruction-file load chain (existence and byte size only), and the `exclude` path.

## How it works

```
  ┌─────────────────────────────┐
  │  DSH built-in loader         │   ← owns injection
  │  dsh-agent-instructions      │
  └──────────────┬──────────────┘
                 │ reads
                 ▼
        <project>/CLAUDE.local.md     ← the data: plain Markdown
                 ▲
                 │ read / write (HTTP)
  ┌──────────────┴──────────────┐
  │  dsh-workspace-rules         │   ← this plugin: editing only
  │  host: /api/workspace-rules  │
  │  client: settings panel      │
  └─────────────────────────────┘
```

- **Host** (`lib/index.js`): registers `GET/POST /api/workspace-rules` through `ctx.connection.fetch.register`. It rides Connection's `/api` channel, so it lands inside the Host/Origin fence and browser authentication for free
- **Client** (`lib/client.js`): a hand-written `window.__ModuleLoader__.load` bundle that `require('react')`s and renders with `createElement` — no JSX, no bundler
- **Writes**: temp file + rename for atomicity; retries on `EPERM`/`EBUSY`, then degrades to a direct write and says so in the response
- **Concurrency**: `baseMtimeMs` optimistic lock; conflicts return 409 and distinguish `appeared` / `changed` / `removed`
- **Backups**: the previous content goes to `$DSH_HOME/backups/workspace-rules/`, **never into the project** (a stray file there would break the exact-match exclude rule)

## Limitations

- **No per-session isolation.** Every session in a workspace shares the same rule file.
- **Exactly one filename is managed: `CLAUDE.local.md`.** `AGENTS.md`, `CLAUDE.md`, and `AGENTS.local.md` in the same directory are reported as present but never modified or previewed.
- **The exclude check runs once, at save time.** The plugin has no idea whether the ignore rule is changed afterwards. The manual equivalent:

  ```bash
  echo "CLAUDE.local.md" >> .git/info/exclude
  ```

  Use `.git/info/exclude`, not `.gitignore`: the former never enters version control, so teammates see nothing at all.

- **Without a git repo this degrades to a warning** and does not block saving (maybe you just want a local scratchpad).
- **The native loader walks the directory chain**: it scans every level from the project root down to the session cwd, and the more specific file wins. That behaviour belongs to DSH, not to this plugin.

## Compatibility

| Item | Value |
|---|---|
| DSH | `>= 0.2.1-rc.5 < 0.3.0-0` |
| Tested on | `0.2.1-rc.5`, `0.2.2-rc.1` |
| Node | `>= 20` |
| Profile | `web` (the desktop app works too, but is not installed through the CLI) |
| Runtime dependencies | none |

The supported range lives in `engines.dsh`. DSH checks it before loading a bundle: a version inside the range loads normally, one outside it (`0.3.0` and up) makes DSH **skip the plugin outright and name the reason in its diagnostics** instead of loading it and failing later.

Declaring it matters: with neither `engines.dsh` nor `peerDependencies`, DSH sees no unmet requirement, which is the same as claiming compatibility with **every** release. When a host release really does change an API, the breakage then shows up at runtime rather than at admission, and the user just sees a dead settings panel. `dsh.compatibility.dshReleases` separately records the releases that were actually tested, for plugin lists and marketplace display.

## Development

Zero runtime dependencies, zero build. Both host and client ship as plain ESM.

```bash
node --check lib/index.js
node --check lib/client.js
```

```
dsh-workspace-rules/
├── .github/workflows/
│   └── publish.yml    # publishes to npm on tag push
├── cordis.patch.yml   # bundle patch: inserts the workspace-rules layer
├── icon.svg           # icon shown on the Plugins page
├── lib/
│   ├── index.js       # host: /api/workspace-rules (Node ESM)
│   └── client.js      # client: settings panel (__ModuleLoader__ bundle)
├── package.json
└── README.md
```

### Releasing

Bump the version in `package.json`, then push a tag:

```bash
git tag v0.1.3 && git push origin main --tags
```

`.github/workflows/publish.yml` then runs: syntax check → verify the tag matches the `package.json` version → skip if already on npm → `npm publish --provenance`.

Authentication prefers the `NPM_TOKEN` repository secret; without it the workflow falls back to npm Trusted Publishing (OIDC), which requires configuring a trusted publisher for this repository and workflow on npmjs.com.

## License

[MIT](LICENSE)

---

<div align="center">

If this saves you from repeating the same instructions every session, a ⭐ is appreciated.

</div>
