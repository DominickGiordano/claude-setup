# claude-setup

This repo IS the source of truth for Dominick's global Claude Code config. Files in `global/` get installed to `~/.claude/` by `install-claude-setup`; files in `project-template/` get scaffolded into new projects by `init-claude-setup`.

## Stack
- Bash 3-compatible CLI scripts (macOS default) — no associative arrays, no `declare -A`
- Node.js ≥ 16 for hooks (`global/hooks/*.js`)
- Markdown for all agents, skills, commands, rules

## Repo layout
- `global/` → deploys to `~/.claude/` (agents, skills, commands, hooks, settings.json, CLAUDE.md)
- `project-template/` → scaffolded into repos by `init-claude-setup` (.claude/, docs/)
- `bin/` → three CLI tools: `install-claude-setup`, `init-claude-setup`, `update-claude-setup`
- `docs/` → research, feature plans, playbook edits for this repo itself

## Non-obvious conventions
- **Never overwrite by default.** All bin/ commands skip existing files; `--force` writes backups to `~/.claude/.backups/` first.
- **`init-claude-setup` never overwrites `CLAUDE.md`** even with `--force`.
- **Symlinks, not copies, for bin.** `setup.sh` symlinks to `~/.local/bin/` so edits are live.
- **Drift detection — two layers.** `update-claude-setup` (read-only) scans arete projects for unique config; `--promote` copies it back. Separately, the `drift-warn.js` SessionStart hook compares `~/.claude/{skills,agents}` against the install manifest at `~/.claude/.installed-state` and warns on local-only files.
- **Subcommand-style commands.** `/issue` and `/status` dispatch on the first arg (`/issue bug …`, `/status --board todo`). Pattern: keep related lifecycle ops under one slash command rather than fragmenting into siblings.
- **This repo has no code deploys.** It's config. Changes land in `~/.claude/` only after `install-claude-setup --force` is run.

## Current drift to watch
The `~/.claude/skills/` count is inflated by the v2.1 commands-as-skills migration — every command in `global/commands/` shows up as a skill directory under `~/.claude/skills/`, so a naive count comparison against `global/skills/` will always look wrong. The `drift-warn` hook handles the real check (skill/agent files present locally but not in the repo manifest); use that instead of comparing counts.

## Gotchas
- macOS ships bash 3 — avoid `declare -A`, use temp files.
- Stop hook writes a session-log stub on every close where `dirty-files` has content and `/end-session` didn't run. Run `/end-session` religiously or the log fills with stubs.
- `dirty-files` accumulating is normal within a session — `/end-session` drains it.
