---
doc: architecture
verified: 2026-08-10
watches:
  - bin/**
  - global/hooks/**
  - global/settings.json
  - project-template/**
---

# Architecture — claude-setup

> Reference with @docs/architecture.md when relevant.
> Not loaded every session — only when needed.
> Install, update and rollback live in @docs/runbook.md, not here.

## Overview

This repo **is** Dominick's global Claude Code config. Not a source that gets built into it —
`~/.claude/{skills,agents,rules,hooks}` are symlinks pointing back here, so there is exactly
one copy of every skill and hook on disk and editing a file in `global/` changes the running
session immediately. No build, no sync, no install step for edits to existing files.

Two independent products live here:

1. **The global config** (`global/`) → linked into `~/.claude/`. One machine, one user.
2. **The project template** (`project-template/`) → copied into other repos by
   `bin/init-claude-setup`. Many repos, copied not linked.

The distinction matters: `global/` changes are live instantly; `project-template/` changes
only reach a repo the next time someone runs `init-claude-setup` there.

## The link-vs-copy split

This is the single most important thing to understand, and it is not uniform:

| Path | Mechanism | Why |
|---|---|---|
| `global/skills/<name>/` | **symlink** per directory | Edits live immediately |
| `global/agents/*.md` | **symlink** per file | Same |
| `global/rules/*.md` | **symlink** per file | Same |
| `global/hooks/*` | **symlink** per file | Same |
| `global/CLAUDE.md` | **copy** | Claude Code writes to `~/.claude/CLAUDE.md` (the `#` memory shortcut). A symlink would push those writes into git. |
| `global/settings.json` | **copy** | Same — Claude Code mutates it. |
| `project-template/**` | **copy**, into other repos | It's a starting point, not a live dependency |

Consequences that bite:

- Editing `global/hooks/foo.js` → **live now**. Editing `global/settings.json` → **must be
  copied to `~/.claude/settings.json`** or re-run `install-claude-setup --force`. Forgetting
  this is why a newly-wired hook appears to do nothing.
- `~/.claude/hooks/` is a real directory of per-file symlinks, **not** a symlinked directory.
  A brand-new hook file therefore needs `install-claude-setup --force` to get its link.
  Same for a brand-new skill directory.

## Layout

```
bin/
  claude-setup            dashboard + dispatcher (update|install|init|update-project|scan|help)
  install-claude-setup    links global/ into ~/.claude   [--force --dry-run --unlink --skip-projects]
  init-claude-setup       scaffolds project-template/ into cwd  [--force --migrate-only]
  update-claude-setup     scans ~/dev/arete for per-project .claude configs worth promoting to global
global/
  CLAUDE.md               copied → ~/.claude/CLAUDE.md
  settings.json           copied → ~/.claude/settings.json  (model, permissions, hooks)
  skills/<name>/SKILL.md  47 skills; long ones keep detail in references/*.md
  agents/*.md             14 agents
  rules/*.md              always-on and path-scoped rules
  hooks/*.js              the enforcement layer
project-template/         scaffolded into other repos (.claude/, docs/, .github/workflows/)
docs/                     this repo's own features, research, solutions
tests/                    node test harnesses for the hooks
examples/                 org-arete.md, org-xomware.md — consumed by the set-org skill
```

`setup.sh` puts `bin/` on PATH. `install.sh` and `init-project.sh` at the root are
**deprecated shims** that redirect to `bin/` — don't add to them.

## Skills

A skill's **directory name is its slash command**, independent of the `name:` in its
frontmatter. `global/skills/mcp/` would shadow the built-in `/mcp`, which is why it is
`mcp-patterns/`. Check for a collision with a built-in before naming a new one.

Both slash commands and model-invoked skills use one uniform layout. The difference is a
single frontmatter key: `disable-model-invocation: true` makes it slash-only.

`/issue` and `/status` dispatch on their first argument rather than existing as families of
sibling commands — lifecycle operations stay under one command.

## Hooks — the enforcement layer

Prose in `CLAUDE.md` is context Claude may deviate from; a hook is not. Anything that must
hold is a hook or a `permissions.deny` entry.

| Hook | Event | Job |
|---|---|---|
| `guard-bash.js` | PreToolUse `Bash` | Blocks catastrophic commands, and enforces `feature → develop → main`. Exit 2 = block; JSON can return `ask` so an ambiguous case becomes a human decision. |
| `track-changes.js` | PostToolUse `Edit\|Write` | Appends edited paths to `.claude/memory/dirty-files`. Excludes `.claude/memory/**` so the log doesn't report itself. |
| `session-end.js` | SessionEnd | Writes a session-log stub if `dirty-files` is non-empty and `/end-session` didn't already write a real entry. |
| `compact-carry.js` | PreCompact `save` / SessionStart `matcher: compact` `restore` | Carries state across a compaction. |
| `doc-staleness.js` | SessionEnd `record` / SessionStart `surface` | Flags docs whose `watches:` globs saw changes. |
| `check-runtime.sh` | called by install, not a hook | Warns on missing node/python/elixir. Never fails hard. |

Two invariants every hook here holds:

- **Fail open.** Any internal error exits 0 and allows. A broken hook must never wedge a
  session. `guard-bash.js` is the only one that ever deliberately blocks.
- **Right event, not the convenient one.** `session-end.js:8` records the lesson: it was
  originally on `Stop`, which fires every turn, so it wrote dozens of stubs per session.
  Moving it to `SessionEnd` fixed it. Anything gated on the user remembering to type a
  command isn't enforcement — see `docs/features/repo-docs/` for the same reasoning applied
  to doc staleness.

## Data flow — installation

```
global/  ──(symlink, per file/dir)──▶  ~/.claude/{skills,agents,rules,hooks}/
   │                                      edits here are live immediately
   └──(copy)──▶  ~/.claude/{CLAUDE.md, settings.json}
                    Claude Code writes to these, so they can't be links

project-template/  ──(copy, via init-claude-setup)──▶  <other repo>/.claude/ + docs/
                   ──(copy, via install --force)─────▶  every path in ~/.claude/.projects
```

That second arrow is the sharp edge: `install-claude-setup --force` **reaches into other
repos**. Pass `--skip-projects` when you only mean to update `~/.claude`.

## Key design decisions

| Decision | Rationale |
|---|---|
| Symlinks, not copies | Drift between repo and `~/.claude` becomes structurally impossible. That's why there is no manifest, no `.installed-state`, and no drift-warning hook — all three would exist to detect a problem that can't happen. |
| Orphans self-identify | A renamed or deleted skill leaves a dangling symlink. `install-claude-setup` prunes links that point into this repo whose target is gone, and never touches anything else. No tracking file needed. |
| `bin/claude-setup help` is generated from the files | A hardcoded list spent four months advertising eight retired commands. |
| `init-claude-setup` never overwrites `CLAUDE.md`, even with `--force` | It's the one file a project author has certainly hand-written. |
| Enforcement in `settings.json` / hooks, never CLAUDE.md prose | The branch-flow rule existed as prose and still let a fix merge straight to `main` and auto-deploy to production. |
| Skill descriptions kept under ~250 chars | The skill listing loads every session and Claude Code truncates it at roughly 1% of the context window, dropping descriptions from least-used skills first. Detail goes in the body or `references/`, which cost nothing until the skill fires. |
| Bash 3 compatible | macOS ships bash 3 — no `declare -A`, no associative arrays. Use temp files. |

## External dependencies

| Thing | Purpose | Notes |
|---|---|---|
| Node.js ≥ 16 | All hooks | Every hook exits 0 silently on older/missing node |
| Bash 3+ | `bin/` scripts | macOS system bash is 3.2 |
| `gh` CLI | `/issue`, `/pr`, `/work-issue`, `guard-bash.js` branch checks | |
| `~/.claude/.projects` | Registry of repos `--force` syncs the template into | 4 repos as of 2026-08-10 |

## Known limitations / TODOs

- [ ] No CI. `tests/*.js` must be run by hand — nothing enforces that they pass.
- [ ] No `develop` branch, so the repo's own hard rule (`feature → develop → main`) can't be
      followed here. `guard-bash.js` returns `ask` rather than blocking in this case.
- [ ] `install.sh` / `init-project.sh` deprecated shims still exist at the root.
- [ ] `update-claude-setup` hardcodes `~/dev/arete` as the scan root (overridable via
      `CLAUDE_SETUP_SCAN_DIR`).
- [ ] Tier 2/3 repo docs (dormant + archived one-liners) not yet written — see
      `docs/features/repo-docs/PLAN.md`.
