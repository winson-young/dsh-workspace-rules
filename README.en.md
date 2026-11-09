<div align="center">

<img src="https://raw.githubusercontent.com/winson-young/dsh-workspace-rules/main/icon.svg" width="88" height="88" alt="dsh-workspace-rules">

# dsh-workspace-rules

**One private rulebook per project, loaded automatically in every new session.**

[简体中文](README.md) | English

[![npm version](https://img.shields.io/npm/v/dsh-workspace-rules?style=flat-square&label=npm&color=cb3837)](https://www.npmjs.com/package/dsh-workspace-rules)
[![npm downloads](https://img.shields.io/npm/dm/dsh-workspace-rules?style=flat-square&label=downloads%2Fmonth&color=1F883D)](https://www.npmjs.com/package/dsh-workspace-rules)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.1--rc.5-6366f1?style=flat-square)](#compatibility)
[![node](https://img.shields.io/badge/node-%3E%3D20-339933?style=flat-square)](#compatibility)
[![dependencies](https://img.shields.io/badge/runtime%20deps-0-brightgreen?style=flat-square)](#compatibility)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

</div>

[Quick start](#quick-tour) · [Highlights](#highlights) · [Install](#install) · [Usage](#usage) · [How it works](#how-it-works) · [Limitations](#limitations) · [Compatibility](#compatibility) · [Changelog](CHANGELOG.md)

---

"Don't add pointless type casts." "Keep every SQL statement inside the model layer." — you say this once per session, in every project.

This plugin turns those lines into **one file inside the project**, loaded automatically by every new session — plus a settings panel so you never have to open an editor.

## Quick tour

In one sentence: **write a rulebook for one project, and DSH loads it into every new session.**

```
you write →  project/CLAUDE.local.md  →  DSH injects it  →  the model follows it
```

Three things you actually do:

| What you want | How |
|---|---|
| Make DSH remember "keep SQL in the model layer" for this project | **Settings → Workspace rules** → pick the project → type one rule → save. Every new session in this project carries it |
| Keep that rule on this machine only | Leave **Sync to project** off (the default). The file is `CLAUDE.local.md`, added to `.git/info/exclude`, invisible to teammates |
| Share that rule with the whole team | Turn **Sync to project** on. The file is `CLAUDE.md`, committed with the repo, effective for anyone who pulls |

One more shortcut: when a conversation surfaces something worth keeping, ask the model to "remember this as a project rule". It files a candidate in the panel's **pending list** — **nothing is written by default**; it only lands in the file after you click **Add** and then **Save**.

**Not a good fit for**: personal habits that span projects (use a global `~/.dsh/AGENTS.md`), or rules that must be enforced (use lint / CI — the model follows instructions, it doesn't guarantee them).

## Highlights

| | |
|---|---|
| **Injection is not its job** | Rules are loaded by DSH's built-in `dsh-agent-instructions` from `<project>/CLAUDE.local.md`. The plugin only reads and writes that file — **if the plugin breaks, your rules still work** |
| **Isolated per workspace** | Rules from project A never leak into project B. The file lives in the project, so isolation is structural |
| **Invisible to teammates** | `CLAUDE.local.md` is a local-only convention; paired with `.git/info/exclude` it never enters version control, so a teammate's Cursor / Codex / [CC] sees no trace of it |
| **Git leak protection** | `.git/info/exclude` is repaired on save; if the file is already tracked by the index the save is refused with a `git rm --cached` hint. Handles submodules and worktrees |
| **Honest load status** | The panel tells you whether the session actually read *this* version of the file, by comparing the real `digest` recorded in the session — not by guessing |
| **One rule per field** | No Markdown by hand. Each rule gets its own input, <kbd>Enter</kbd> starts the next one, `↑` `↓` reorder, `×` deletes; the heading at the top and any trailing prose are preserved as-is |
| **Local-only or shared** | One switch: off writes `CLAUDE.local.md` and keeps it out of git via `exclude` (teammates see nothing); on writes `CLAUDE.md` straight into the repository |
| **Pending list** | Rules spotted during a session land in the panel and are **not written by default**. Only after you click **Add** do they reach the editor, and only after **Save** do they reach the file |
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
3. Decide who the rulebook is for: **Sync to project** off = this machine only (default), on = committed to the repo
4. Fill in one rule per field
5. Save

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

### Local-only vs. shared

| | Sync to project off (default) | Sync to project on |
|---|---|---|
| File written | `CLAUDE.local.md` | `CLAUDE.md` |
| `.git/info/exclude` | appended automatically, file stays out of git | left alone |
| Teammates see it | no | yes, it travels with the repo |
| File already tracked by git | **save refused**, tells you to run `git rm --cached` | fine, that is the point |

The two modes fail in opposite directions, and the panel warns accordingly: local mode worries about *not* being ignored, sync mode worries about being ignored (so the file never gets committed).

If both files exist in one directory, the loader reads **both** (the more specific one later). The panel points this out but never merges them for you.

### Rules collected during a session

Ask the model to "remember this as a project rule" and it calls `suggest_workspace_rule` with your candidates. Nothing is written to the project — candidates land in the panel's pending list, stored under `$DSH_HOME/workspace-rules/pending/`:

- **Add** → appended as the last row of the editor, marked unsaved. **Nothing hits the file until you save**
- **Dismiss** → drop that one
- **Dismiss all** → clears the list (with a confirmation)

In text-editor mode **Add** is disabled — there is no row to append to, so switch back to the rule editor first.

After saving:

- **New sessions** read the latest content on their first step
- **The current session** may keep following the old content — the workspace layer hot-reloads, but **instructions already in context are not retracted**. So you don't have to start a new chat, and you shouldn't expect old rules to vanish immediately either

The diagnostics section at the bottom of the panel shows: load status, which session it was taken from, the instruction-file load chain (existence and byte size only), and the `exclude` state for the current mode.

## How it works

```
  ┌─────────────────────────────┐
  │  DSH built-in loader         │   ← owns injection
  │  dsh-agent-instructions      │
  └──────────────┬──────────────┘
                 │ reads
                 ▼
    <project>/CLAUDE.local.md  (local)
    <project>/CLAUDE.md        (shared)
                 ▲
                 │ read / write (HTTP)
  ┌──────────────┴──────────────┐
  │  dsh-workspace-rules         │   ← this plugin: editing only
  │  host: /api/workspace-rules  │
  │  client: settings panel      │
  └─────────────────────────────┘
```

- **Host** (`lib/index.js`): registers `GET/POST /api/workspace-rules` through `ctx.connection.fetch.register`. It rides Connection's `/api` channel, so it lands inside the Host/Origin fence and browser authentication for free. Also registers the `suggest_workspace_rule` tool so a session can file candidates
- **Client** (`lib/client.js`): a hand-written `window.__ModuleLoader__.load` bundle that `require('react')`s and renders with `createElement` — no JSX, no bundler
- **Writes**: temp file + rename for atomicity; retries on `EPERM`/`EBUSY`, then degrades to a direct write and says so in the response
- **Concurrency**: `baseMtimeMs` optimistic lock; conflicts return 409 and distinguish `appeared` / `changed` / `removed`
- **Backups**: the previous content goes to `$DSH_HOME/backups/workspace-rules/`, **never into the project** (a stray file there would break the exact-match exclude rule)

### Why sync mode can only write `CLAUDE.md`

The loader recognises exactly four names: `AGENTS.md`, `CLAUDE.md`, `AGENTS.local.md`, `CLAUDE.local.md`. Adding a fifth means editing `dsh-agent-instructions`' config, and that config is nested inside the agent preset where a bundle patch cannot reach it (writing `id: 'preset-standard:agent-instructions'` is silently ignored — no error).

Taking over injection means reimplementing the official 63 KB of logic: session-restore reconciliation, re-injection after compaction, sub-agent inheritance, incremental deduplication. Miss one and rules appear and disappear at random — far worse than a different filename. So sync mode writes `CLAUDE.md`.

## Limitations

- **No per-session isolation.** Every session in a workspace shares the same rule file.
- **Only two filenames are written**: `CLAUDE.local.md` (sync off) or `CLAUDE.md` (sync on). `AGENTS.md` and `AGENTS.local.md` in the same directory are reported as present but never modified or previewed.
- **The exclude check runs once, at save time**, and only matters while sync is off. The plugin has no idea whether the ignore rule is changed afterwards. The manual equivalent:

  ```bash
  echo "CLAUDE.local.md" >> .git/info/exclude
  ```

  Use `.git/info/exclude`, not `.gitignore`: the former never enters version control, so teammates see nothing at all.

- **Without a git repo this degrades to a warning** and does not block saving (maybe you just want a local scratchpad).
- **The native loader walks the directory chain**: it scans every level from the project root down to the session cwd, and the more specific file wins. That behaviour belongs to DSH, not to this plugin.
- **Pending candidates live outside the project.** They sit under `$DSH_HOME`, so deleting the project directory leaves them behind — they were never confirmed, so they were never the project's.

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

## License

[MIT](LICENSE)

---

<div align="center">

If this saves you from repeating the same instructions every session, a ⭐ is appreciated.

</div>
