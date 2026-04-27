# Execution Log: Setup Modernization 2026

**Started**: 2026-04-26
**Phase 1 completed**: 2026-04-26

## Phase 1

### 1.1 Drift reconciliation — DONE (no-op)

Ran `update-claude-setup --promote`. Findings:
- Brainstorm's "22 missing skills" claim was wrong — the 43-vs-21 delta was the v2.1 commands-as-skills migration, not real drift.
- Real cross-project drift: 4 minor items (1 skill, 2 agents, 1 command), all skipped.
  - 2 skipped due to bugs in `update-claude-setup` itself (`gents`/`kills` path typos — first char of `agents`/`skills` stripped).
  - 2 skipped (likely interactive prompt got no input).
- Repo unchanged. **Follow-up**: file an issue for the path typos in `update-claude-setup`.

### 1.2 Wrapper retirement — DONE

- **Retired** (deleted): `compound.md`, `setup.md`, `test.md`, `review.md`
- **Kept with pre-flight context** (added 5-10 lines before `$ARGUMENTS`): `brainstorm.md`, `plan.md`, `execute.md`, `orchestrate.md`
  - `/brainstorm`: checks for prior `RESEARCH.md`, lists existing feature folders to surface duplicates
  - `/plan`: checks for `RESEARCH.md`/`BRAINSTORM.md`, refuses to overwrite In Progress/Ready plans without `--force`
  - `/execute`: refuses to start if plan status is `Draft`
  - `/orchestrate`: verifies plan is actually an epic before proceeding

### 1.3 Retire ios-specialist — DONE

- Deleted `global/agents/ios-specialist.md`
- iOS references in `work-issue.md` removed as part of 1.4 slim
- iOS work now loads `ios-standards` skill directly

### 1.4 Slim work-issue + dispatcher agent — DONE (acceptance partially met)

- Created `global/agents/dispatcher.md` (86 lines) — handles deep analysis, domain classification, and routing logic
- Slimmed `work-issue.md` from 234 → 162 lines (30% reduction)
- **Plan target was ≤130** — overshot by 32 lines
- **Reason**: the work-plan and completion-comment HEREDOC templates (steps 3 and 8) are mandatory per the plan and account for ~50 lines together. Trimming them would lose required output. Acceptance criterion "domain classification logic in exactly one place" is met (dispatcher owns it).

### 1.5 Merge /board into /status — DONE

- Rewrote `global/commands/status.md` with default (both sections) + `--features` and `--board [filter]` flags
- Deleted `global/commands/board.md`
- All four old `/board` filter modes (`in-progress`, `blocked`, `todo`, full) preserved via `--board <filter>`

### 1.6 Merge issue commands into /issue — DONE

- Created `global/commands/issue.md` (187 lines, under 250 ceiling)
- Subcommands: `bug`, `new`, `from-plan`, `update`
- Deleted `bug.md`, `backlog.md`, `update-issue.md`
- Preserved key rules from each: "ALWAYS ask before creating" (bug), "always include subtasks" (new), "Read the issue BEFORE updating" (update)

### 1.7 Drift-warn hook — DONE (manifest-based, not naive count)

- Created `global/hooks/drift-warn.js` (executable)
- Modified `bin/install-claude-setup` to write a manifest at `~/.claude/.installed-state` containing repo path, SHA, and lists of skills/commands/agents at install time
- Hook compares `~/.claude/skills/*/SKILL.md` and `~/.claude/agents/*.md` against the manifest. Warns on local additions only.
- Wired into `global/settings.json` SessionStart hooks (alongside the existing `compact` matcher)
- Tested: hook runs clean (exit 0, no output) when state matches manifest

### 1.8 Update global/CLAUDE.md — DONE

- Replaced `/compound` rule line with "Ask the `compounder` agent to capture patterns"
- Added new sections: **Issue lifecycle commands** (`/issue` subcommands + `/work-issue`), **Status commands** (`/status` flags)
- File grew from 95 → 107 lines (well under 200-line cap)
- No lingering refs to retired commands (`/compound`, `/test`, `/review`, `/setup`, `/board`, `/bug`, `/backlog`, `/update-issue`)

### 1.9 Update repo CLAUDE.md — DONE

- Replaced misleading "Current drift to watch" section explaining the v2.1 commands-as-skills migration phantom delta and pointing to the new `drift-warn` hook
- Added note under "Non-obvious conventions": subcommand-style commands (`/issue bug`, `/status --board todo`) as a pattern
- Updated drift-detection bullet to reflect both layers (cross-project promote + per-install manifest)
- File grew from 30 → 30 lines (no change in length)

### 1.10 Deploy — DONE (with manual orphan cleanup)

- Ran `install-claude-setup --force`. Backups: `~/.claude/.backups/20260426-225916/`
- Manifest written: `~/.claude/.installed-state` (sha=cebd780, 21 skills, 16 commands, 14 agents)
- **Install script doesn't delete orphans** — retired commands/agents lingered in `~/.claude/`. Cleaned up manually:
  - `rm -r ~/.claude/skills/{compound,setup,test,review,bug,backlog,update-issue,board}`
  - `rm ~/.claude/agents/ios-specialist.md`
- Verified post-cleanup: all retired skill dirs gone, `~/.claude/skills/{issue,status}` present, `~/.claude/agents/dispatcher.md` present, `ios-specialist.md` gone, `drift-warn.js` installed
- **Follow-up**: install script should delete orphaned files when source is missing — file an issue.

## Phase 1 — Final state

| Artifact | Before | After |
|---|---|---|
| Commands | 22 | 16 |
| Agents | 14 | 14 (retired ios-specialist, added dispatcher) |
| Skills | 21 | 21 (Phase 2 will restructure) |
| Hooks | 4 | 5 (added drift-warn.js) |
| `work-issue.md` lines | 234 | 162 |
| `global/CLAUDE.md` lines | 95 | 107 |
| `repo/CLAUDE.md` lines | 30 | 30 |

## Follow-up issues to file

1. `update-claude-setup --promote` has path typos: `gents` (should be `agents`), `kills` (should be `skills`). First char of dir name is being stripped.
2. `install-claude-setup --force` doesn't delete orphan files when sources are removed from `global/`. Should detect and prune.

## Status

Phase 1 ready for Dom to review and commit. Phase 2 deferred per plan (run only after Phase 1 has been lived-with for ≥3 days).
