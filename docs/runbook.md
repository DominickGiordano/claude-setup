---
doc: runbook
verified: 2026-08-10
watches:
  - bin/**
  - setup.sh
  - global/settings.json
  - global/hooks/check-runtime.sh
---

# Runbook — claude-setup

> How to install, change, and un-break this config.
> Reference with @docs/runbook.md when relevant. Not loaded every session.
> What the pieces are lives in @docs/architecture.md.

**There is no deploy.** This repo has no CI, no build, and no remote environment — verified
2026-08-10: no `.github/` directory exists here. "Shipping" means the symlinks in `~/.claude`
point at your working tree, so a saved file is already in production for your next session.
That is the whole reason the discipline below matters.

## Run it locally

```bash
git clone git@github.com:aretecp/claude-setup.git ~/dev/arete/claude-setup
cd ~/dev/arete/claude-setup
./setup.sh                        # puts bin/ on PATH
install-claude-setup              # safe by default: never replaces a real file
```

First install on a machine that already has real files in `~/.claude`:

```bash
install-claude-setup --dry-run --force    # ALWAYS dry-run first — it prints exactly what it will touch
install-claude-setup --force              # backs up to ~/.claude/.backups/<timestamp>/ first
```

Prerequisites: Node.js ≥ 16 (hooks), bash 3+ (scripts), `gh` CLI (issue/PR commands).
`global/hooks/check-runtime.sh` runs during install and warns about missing runtimes without
failing.

## Environments

One: your laptop. `~/.claude/` is the only target. There is no dev/prod split and nothing to
promote.

| "Env" | Path | How it updates |
|---|---|---|
| live config | `~/.claude/` | symlinks into this repo — instant for existing files |
| other repos | any path in `~/.claude/.projects` | only when `--force` runs without `--skip-projects` |

## The four things that need an install step

Editing an existing file under `global/skills`, `global/agents`, `global/rules`, or
`global/hooks` is live immediately — do nothing. You need to act only for:

| Change | Command |
|---|---|
| **New** hook file | `install-claude-setup --force --skip-projects` (creates the per-file symlink) |
| **New** skill or agent directory | same |
| `global/settings.json` edited | `cp global/settings.json ~/.claude/settings.json` — it's copied, not linked |
| `global/CLAUDE.md` edited | `install-claude-setup --force --skip-projects` — also copied |

Before copying `settings.json`, diff it — Claude Code writes to the live file, so it may hold
changes yours would clobber:

```bash
diff global/settings.json ~/.claude/settings.json
node -e "JSON.parse(require('fs').readFileSync('global/settings.json','utf8'))"   # validate first
```

**`--force` without `--skip-projects` reaches into other repos.** It copies
`project-template/` into every path in `~/.claude/.projects`. Always pass `--skip-projects`
unless propagating a template change is exactly what you mean to do.

## Secrets

None. This repo contains no credentials and needs none. `settings.json` denies reading
`.env`, `.env.*`, `**/.env*` and `**/secrets/**` — that's a guard for *other* repos you work
in, not a secret store for this one.

## Verify it worked

```bash
ls -l ~/.claude/hooks/            # every entry should be a symlink into this repo
ls -l ~/.claude/skills/ | head    # same
claude-setup help                 # generated from the files — a new command shows up here
node tests/test-guard-bash.js "$PWD/global/hooks/guard-bash.js" <repo-with-develop> <repo-without>
node tests/test-doc-staleness.js  # self-contained, no arguments
```

A hook that "does nothing": check `~/.claude/hooks/<name>.js` exists **and** that
`~/.claude/settings.json` references it. A new hook needs both, and only the first comes from
a symlink.

## Rollback

```bash
ls -1t ~/.claude/.backups/                       # newest first; install keeps the 10 newest
cp -R ~/.claude/.backups/<timestamp>/. ~/.claude/
```

Because the config is symlinks into a git worktree, ordinary git is the real rollback:

```bash
git -C ~/dev/arete/claude-setup log --oneline -10
git -C ~/dev/arete/claude-setup revert <sha>      # live the moment it lands
```

Full detach — turn every symlink back into a real file and stop tracking this repo:

```bash
install-claude-setup --unlink
```

**Does not roll back cleanly:**

- `project-template/` files already copied into other repos. Those are independent copies;
  reverting here changes nothing in them. Fix each repo, or re-run `init-claude-setup` there.
- `~/.claude/CLAUDE.md` and `settings.json` are copies — reverting the repo does **not**
  revert them. Re-run `install-claude-setup --force --skip-projects` after the revert.
- Anything Claude Code wrote into `~/.claude/CLAUDE.md` via the `#` shortcut since the last
  install is in the backup only.

## Scheduled work

| What | Schedule | Defined in | If it stops |
|---|---|---|---|
| none | — | — | — |

No crons, no timers, no CI. `project-template/.github/workflows/*.yml` are templates for
*other* repos and never execute here.

## Gotchas

- **Edited `settings.json`, hook still not firing** → it's copied, not linked. `cp` it.
- **New hook file, nothing happens** → `~/.claude/hooks/` is a directory of per-file
  symlinks, not a linked directory. Run `install-claude-setup --force --skip-projects`.
- **A skill quietly stopped working after a rename** → the old symlink is dangling. Re-run
  the install; it prunes links pointing into this repo whose target is gone.
- **New slash command never fires** → its directory name may collide with a Claude Code
  built-in. `global/skills/mcp/` would shadow `/mcp`; that's why it's `mcp-patterns/`.
- **`declare -A: invalid option`** → macOS bash 3. Use a temp file.
- **A script aborts mid-run for no reason** → under `set -e`, a failing command substitution
  in an assignment kills the script. Use `x="$(grep ... || true)"` when a match is optional.
- **Every item in a loop silently skipped** → `read -p` inside a `cmd | while read` loop eats
  the piped input. Use `done < <(cmd)` and `read ... < /dev/tty`.
- **`dirty-files` looks like it's accumulating garbage** → normal within a session.
  `/end-session` drains it.
- **PR blocked by `guard-bash.js`** → it's right. Fix the base branch, don't work around it.
  This repo has no `develop`, so it returns `ask` here instead of blocking.
