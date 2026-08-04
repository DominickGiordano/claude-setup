# claude-setup

This repo IS the source of truth for Dominick's global Claude Code config — literally: `~/.claude/{skills,agents,rules,hooks}` are **symlinks into `global/`**, so there is one copy on disk and editing a file here changes the live session immediately. `project-template/` gets scaffolded into new projects by `init-claude-setup`.

## Stack
- Bash 3-compatible CLI scripts (macOS default) — no associative arrays, no `declare -A`
- Node.js ≥ 16 for hooks (`global/hooks/*.js`)
- Markdown for all agents, skills, rules

## Repo layout
- `global/skills/<name>/SKILL.md` → symlinked to `~/.claude/skills/<name>`. Both slash commands (`disable-model-invocation: true`) and model-invoked skills live here — one uniform layout. Long skills keep detail in `references/*.md` alongside `SKILL.md`.
- `global/agents/*.md`, `global/rules/*.md`, `global/hooks/*.js` → symlinked into the matching `~/.claude/` dir
- `global/CLAUDE.md`, `global/settings.json` → **copied**, not linked (Claude Code writes to those; a link would push its writes into git)
- `project-template/` → scaffolded into repos by `init-claude-setup` (.claude/, docs/)
- `bin/` → `claude-setup` (dashboard), `install-claude-setup`, `init-claude-setup`, `update-claude-setup`
- `docs/` → research, feature plans, playbook edits for this repo itself

## Non-obvious conventions
- **Symlinks, not copies.** Drift between repo and `~/.claude` is structurally impossible, so there is no manifest, no `.installed-state`, and no drift-warning hook. `install-claude-setup --force` is only needed for brand-new files or to convert an old copy-based install. `--unlink` reverses it.
- **Orphans self-identify.** A renamed or deleted skill leaves a dangling symlink; `install-claude-setup` prunes links pointing into this repo whose target is gone, and never touches anything else.
- **`--force` reaches into other repos.** It also copies `project-template/` files into every path in `~/.claude/.projects`. Pass `--skip-projects` when you only mean to update `~/.claude`.
- **`init-claude-setup` never overwrites `CLAUDE.md`** even with `--force`.
- **`bin/claude-setup help` is generated from the files**, not hardcoded — a hardcoded list is exactly how it spent four months advertising eight retired commands.
- **Subcommand-style commands.** `/issue` and `/status` dispatch on the first arg (`/issue bug …`, `/status --board todo`). Keep related lifecycle ops under one slash command rather than fragmenting into siblings.
- **A skill's directory name is its slash command**, not its `name:` frontmatter. `global/skills/mcp/` would shadow the built-in `/mcp` — that's why it's `mcp-patterns/`.
- **Enforcement beats prose.** Rules that must hold go in `settings.json` or a hook, not a CLAUDE.md bullet. CLAUDE.md is context Claude may deviate from; `permissions.deny` and `PreToolUse` are not.

## Context budget
The skill listing loads every session and Claude Code truncates it when it overflows (~1% of the context window), dropping descriptions from least-used skills first. Keep each `description` under ~250 chars and put trigger phrases in `when_to_use`. Detail belongs in the skill body or `references/`, which cost nothing until the skill fires.

## Gotchas
- macOS ships bash 3 — avoid `declare -A`, use temp files.
- Under `set -e`, a failing command substitution in an assignment aborts the script. `x="$(grep ... || true)"` when a match is optional.
- Never `read -p` inside a `cmd | while read` loop — the prompt consumes the piped input and every item is silently skipped. Use `done < <(cmd)` plus `read ... < /dev/tty`.
- `dirty-files` accumulating is normal within a session — `/end-session` drains it.
</content>
