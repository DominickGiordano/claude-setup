# Plan: Global Setup Overhaul (Aug 2026)

**Status**: Done (Phases 0–4 executed 2026-08-04; Phase 5 deferred by design)
**Created**: 2026-08-04
**Research**: `./RESEARCH.md`
**Outcome + deviations**: `./EXECUTION_LOG.md` — five steps were changed or dropped during
execution because the plan was wrong on them (notably 3.3 `paths:` would have narrowed
skill activation, and forking 4 of the 5 wrapper commands would have deleted their
approval gates). Read the log, not just this plan.
**Supersedes**: Phase 2 of `docs/features/setup-modernization-2026/PLAN.md`

## Summary

Six phases, ordered so nothing depends on a later phase. Phase 0 fixes live hazards. Phase 1 replaces the copy-based installer with symlinks, which deletes the drift machinery rather than improving it. Phases 2–3 cut context cost and move rules from prose into enforcement. Phase 4 collapses command+agent pairs. Phase 5 is deferred autonomy work.

Phases 0–1 are independently shippable and worth doing even if the rest is dropped.

**Rollback for all phases**: `~/.claude/.backups/<timestamp>/` (auto-created by `--force`) plus `git revert`. Phase 1 additionally needs `--unlink` to restore copies.

---

## Phase 0 — Stop the bleed

Target: ~1 hour. No architecture changes. Every item is a bug or a live hazard.

### 0.1 Promote the branch-flow rule into the repo (do this FIRST)

`~/.claude/CLAUDE.md` has a 13-line "Branch Flow — HARD RULE" section absent from `global/CLAUDE.md`. Any `install --force` destroys it.

- Copy the section verbatim from `~/.claude/CLAUDE.md` into `global/CLAUDE.md`
- Re-check `wc -l global/CLAUDE.md` ≤ 200 (currently 134 → ~147)

**Acceptance**: `diff global/CLAUDE.md ~/.claude/CLAUDE.md` is empty.

### 0.2 Reconcile the other three drift items

- `settings.json`: adopt installed values into the repo — `model: "opus[1m]"`, `tui: "fullscreen"`, `skipDangerousModePermissionPrompt: true`, `skipWorkflowUsageWarning: true`
- Delete `"subagentModel": "sonnet"` — not a real settings key (H7)
- Rename `global/skills/mcp.md` → `mcp-patterns.md` and set `name: mcp-patterns`, so it stops shadowing the built-in `/mcp` (H5)
- Install so the fixed `pr` command (reads `base_branch`, doesn't hardcode `main`) actually reaches `~/.claude/` (H6)

**Acceptance**: `diff global/settings.json ~/.claude/settings.json` empty; `~/.claude/skills/mcp/` gone; `grep -c 'git diff main' ~/.claude/skills/pr/SKILL.md` is 0.

### 0.3 Give the research agents web access

- `global/agents/researcher.md`: `tools: Read, Write, Glob, Grep, Bash, WebSearch, WebFetch`
- Delete the "If you can't answer something without external access, name the gap clearly" principle — it documented the bug
- Add `WebSearch, WebFetch` to `brainstorm.md` and `planner.md`

**Acceptance**: `/research` on an unfamiliar library produces a doc citing external URLs, not just repo greps.

### 0.4 Fix `--promote` stdin capture

`bin/update-claude-setup:~123` — `read -p` inside a piped `while read` consumes the findings list.

- Change `read -p ... -r` → `read -p ... -r < /dev/tty`, or restructure the loop to `done < <(sort ...)`

**Acceptance**: run `--promote` against a project with a unique config; the prompt waits for a keypress and `y` actually copies.

### 0.5 Prune orphans on install

- In `install-claude-setup`, after copying: read the *previous* `.installed-state`, diff against current source lists, `rm -r` the removed skill dirs / agent files
- Print each removal; skip in `--dry-run`; require `--force` to prune

**Acceptance**: delete a skill from `global/skills/`, run `--force`, confirm its `~/.claude/skills/<name>/` is gone without manual `rm`.

### 0.6 Repo hygiene

- `rm -rf ./\{global` (4 brace-expansion junk dirs, H9)
- Decide `AGENTS.md`: delete the Claude→Codex mangled copy, or rewrite it properly and make `CLAUDE.md` start with `@AGENTS.md` (open question — needs a call)
- `bin/claude-setup`: rewrite `show_reference()` against the actual 16 commands; fix `show_status()` to count `~/.claude/skills/*/SKILL.md` instead of the always-empty `~/.claude/commands/*.md`

**Acceptance**: `find . -path '*{*' -not -path './.git/*'` empty; every command named by `claude-setup` resolves to a file in `global/commands/`.

---

## Phase 1 — Symlink architecture

Target: ~2 hours. Depends on 0.x landing. **This is the phase that pays for itself** — it deletes more than it adds.

### 1.1 Verify the two undocumented behaviours first

Do not restructure before these answer yes/no. Test by hand in a scratch dir:

1. Does the skill file-watcher pick up edits through a symlinked skill dir? (`ln -s`, edit target, check same session)
2. Does `~/.claude/agents/` load a symlinked `.md`?

If (1) is no, symlinks still kill drift but lose live-reload — proceed anyway. If (2) is no, keep copying agents and symlink only skills.

### 1.2 Restructure skills to directory-per-skill

`global/skills/<name>.md` → `global/skills/<name>/SKILL.md` (24 skills). Same for `global/commands/<name>.md` → `global/skills/<name>/SKILL.md` with `disable-model-invocation: true` preserved, so there is **one uniform layout**.

Phase 3 needs this layout for `references/`. Doing it once here serves both.

**Acceptance**: `ls global/skills/*/SKILL.md | wc -l` = 40; no `.md` files remain directly under `global/skills/`.

### 1.3 Replace copy with symlink in the installer

- `install-claude-setup` links `~/.claude/skills/<name>` → `$REPO_DIR/global/skills/<name>` for each skill
- Same for `~/.claude/agents/<name>.md` and `~/.claude/rules/<name>.md` (if 1.1 permits)
- `CLAUDE.md` and `settings.json` stay **copies** — Claude Code and other tools write to them, and a symlink would push those writes into the repo
- Add `--unlink` to restore copies (rollback path)
- Keep `--dry-run`; keep backups on first conversion

**Acceptance**: `ls -l ~/.claude/skills/ | grep -c '^l'` = 40; editing `global/skills/elixir/SKILL.md` changes what a session sees with no reinstall.

### 1.4 Delete the drift machinery

Now structurally unnecessary:

- `global/hooks/drift-warn.js` (101 lines) + its `settings.json` SessionStart entry
- `.installed-state` writer in `install-claude-setup` (keep only if 0.5's prune logic still needs it — with symlinks it does not)
- `bin/update-claude-setup` `--promote` mode (nothing to promote when there's one copy). Keep the read-only cross-project **scan** — that still finds configs living in project repos.
- The "Current drift to watch" section in `CLAUDE.md`, and the drift bullet under "Non-obvious conventions"

**Acceptance**: `bin/` total line count drops by ≥250; no session-start drift warning; `grep -rn "installed-state\|drift-warn" .` returns only historical docs.

### 1.5 Update repo docs to match

- `CLAUDE.md`: replace "Never overwrite by default" and the two-layer-drift bullets with the symlink model; note `CLAUDE.md`/`settings.json` are the copied exceptions
- `README.md` / `ONBOARDING.md`: both currently enumerate commands and will rot — have one reference the other rather than duplicating

---

## Phase 2 — Enforce, don't ask

Target: ~1.5 hours. Independent of Phase 1.

### 2.1 Move enforceable rules from prose into `settings.json`

- `includeCoAuthoredBy: false` — replaces the "Do NOT add Co-Authored-By — ever" bullet
- `attribution: { commit: "", pr: "..." }` — set explicitly rather than relying on the model
- Consider `effortLevel`, `fallbackModel`, `alwaysThinkingEnabled` (needs a call on defaults)

Delete the now-redundant CLAUDE.md bullets. Keep the *branch flow* prose — 2.2 backs it with a hook, but the reasoning is still worth loading.

### 2.2 Hard-block PRs targeting `main`

New `global/hooks/guard-pr-base.js`, `PreToolUse` matcher `Bash`, exit 2 on:

- `gh pr create` with `--base main` / `-B main` when `git ls-remote --heads origin develop` is non-empty
- `git push` to `main`, `git merge` into `main`

Message must name the rule and the develop→main promotion path. This is the one rule with a documented production incident behind it; prose alone has already failed once.

**Acceptance**: `gh pr create --base main` is blocked in a repo with `develop`; allowed in one without.

### 2.3 Rewire session logging off `Stop` onto `SessionEnd`

`session-end.js` currently fires every turn — the documented cause of stub spam.

- Move the hook entry from `Stop` to `SessionEnd`
- Drop the now-pointless "already stubbed this session" dedup guards
- Delete the "Stop hook writes a session-log stub on every close" gotcha from `CLAUDE.md`

**Acceptance**: a 10-turn session appends exactly one stub, at exit.

### 2.4 Make the compact hook do real work

Replace the `echo 'Context was compacted…'` SessionStart:compact entry with a `PreCompact` hook that writes current `dirty-files` + branch + open plan into a scratch note, and a SessionStart:compact hook that returns it as `additionalContext`. Carries state across compaction instead of asking Claude to remember to re-read.

---

## Phase 3 — Context diet

Target: ~4 hours. Depends on 1.2 (directory layout).

### 3.1 Rewrite all 24 skill descriptions

11,489 chars today; target **≤250 chars each (~6k total)**.

- Move every `Trigger phrases: …` list from `description` into `when_to_use`
- Lead with the key use case — the combined text is capped at 1,536 chars and `description` is what gets truncated first
- Drop the `ALWAYS use when` boilerplate prefix; it's on all 24 so it distinguishes nothing

**Acceptance**: no description >250 chars; total <6,500; spot-check that `phoenix`, `ash`, `terraform` still auto-fire on a natural request.

### 3.2 Split oversized bodies into `references/`

Six skills over 250 lines. `SKILL.md` becomes a navigation layer that names each reference file and when to open it.

| Skill | Now | Split |
|---|---|---|
| `docker-deploy` | 363 | compose / traefik / dockerfile |
| `ash` | 332 | resources-actions / policies / migrations |
| `microsoft-graph` | 314 | auth / mail-calendar / webhooks |
| `python` | 279 | core + `references/{fastapi,pydantic}.md` |
| `phoenix` | 266 | liveview / forms |
| `elixir` | 246 | trim only |

Explicitly **not** doing April's plan of promoting these to sibling top-level skills — that inflates the listing this phase is shrinking.

**Acceptance**: every `SKILL.md` ≤150 lines; concatenating `SKILL.md` + `references/*` against the old file shows only intentional cuts.

### 3.3 Add `paths:` gating to file-typed skills

Glob-gated activation is more reliable than keyword matching: `elixir`/`phoenix`/`ash` → `**/*.{ex,exs}`; `ts-component`/`frontend-standards` → `**/*.{ts,tsx}`; `terraform` → `**/*.tf`; `ios-standards` → `**/*.swift`; `python` → `**/*.py`.

Leave `pre-impl-audit`, `testing`, `anthropic-api`, `mcp-patterns` un-pathed — they're intent-driven, not file-driven.

### 3.4 Split `~/.claude/CLAUDE.md` into `~/.claude/rules/`

147 lines / ~2.3k tokens every session. Keep in CLAUDE.md: identity, working style, stack, response defaults, workflow map, branch flow. Move out:

| → `~/.claude/rules/` | `paths:` |
|---|---|
| `verification.md` (Verification Before Pushing) | `**/*.{tsx,jsx,heex,eex,html,yml,yaml}` |
| `root-cause.md` (Root-Cause + Diagnostic Commands) | none — always on |
| `git-discipline.md` (Commit Rules + Issue Discipline) | none |
| `arete-baseline.md` (April's 2.3 extraction) | none |
| `lessons.md` | none |

Be honest about the payoff: only path-scoped rules reduce launch context. The un-pathed ones are moved for maintainability, and the real reduction comes from `verification.md` plus trimming duplication between the four `*-standards` skills (April's 2.3) and these rules.

**Acceptance**: `~/.claude/CLAUDE.md` ≤80 lines; `/context` shows `verification.md` absent until a `.tsx` is touched.

### 3.5 Fold cross-cutting skills into rules or language skills

Per April's 2.4, now with the listing-budget rationale: `error-handling` and `env-config` → language skill `references/`; `logging` → `arete-baseline.md` rule. Re-verify each by reading before merging.

**Acceptance**: skill count drops to ~20; nothing lost (concatenate-and-diff).

---

## Phase 4 — Collapse the workflow

Target: ~3 hours. Depends on Phase 1.

### 4.1 Convert wrapper command+agent pairs to forked skills

`/research`, `/brainstorm`, `/plan`, `/execute`, `/orchestrate` are thin wrappers that delegate to an agent and block the session. Each becomes one skill:

```yaml
---
description: …
when_to_use: …
disable-model-invocation: true
argument-hint: "[topic]"
context: fork
agent: planner        # keep the agent for its system prompt + tools
background: false     # these are interactive; don't background them
---
```

Keep the agent files — `context: fork` uses them for the system prompt, tools, and model. What goes away is the wrapper's duplicated pre-flight prose. Net: 5 fewer files' worth of duplication, and the option to background long research.

Do **not** convert `/fix`, `/work-issue`, `/issue`, `/status`, `/commit`, `/pr`, `/end-session` — those are multi-step procedures that belong in the main session, not a fork.

**Acceptance**: `/plan foo` still produces `docs/features/foo/PLAN.md` with pre-flight checks intact (existing RESEARCH/BRAINSTORM detected, `In Progress` plans refused without `--force`).

### 4.2 Agent frontmatter pass

- Add `skills:` preload to `debugger`, `code-reviewer`, `executor` (only 3 of 14 preload today)
- Add `effort` where it matters; drop `model: opus` where Sonnet suffices — 6 agents pin Opus with no stated reason
- Add `color` for transcript readability
- Consider `isolation: worktree` on `executor` so parallel runs can't collide

### 4.3 Decide `guard-bash.js`'s future

Its blocked patterns overlap `permissions.deny` in `settings.json`. Either delete it and rely on deny rules, or keep it as the home for 2.2's branch guard and drop the duplicated `rm -rf` patterns. Pick one — don't maintain both. (Open question.)

---

## Phase 5 — Autonomy (deferred)

Not needed now per the ask. Recorded so the constraint isn't rediscovered later.

**The gate**: `~/.claude/skills/` is invisible to Cowork, cloud sessions, and scheduled routines. Local symlinks (Phase 1) are correct for daily work and a dead end for autonomy. Reaching autonomous runs requires packaging as a plugin declared in each repo's `.claude/settings.json`.

When that becomes worth doing:

- `.claude-plugin/plugin.json` at repo root, `version` pinned so updates are deliberate
- Marketplace from a private repo → `/plugin marketplace add`, `/plugin update`
- Cost: commands become `/arete:plan` (namespaced), and hook/agent/MCP changes need `/reload-plugins` instead of live reload
- Then: `monitors.json` for CI/log watching, agent `memory: project`, `TaskCreated`/`TaskCompleted` hooks, scheduled routines

Revisit when either (a) a teammate needs this config, or (b) scheduled autonomous runs are actually wanted.

---

## Out of scope

- Plugin/marketplace packaging (Phase 5)
- Retiring any of the 4 domain specialists or the `researcher`/`brainstorm` split
- `project-template/` restructure — path-scoped rules there are already correct
- The `.github/workflows` CI triage automation
- Anything touching Areté project repos other than reading their `.claude/` for the scan

## Decisions needed before `Ready`

- [ ] `AGENTS.md` — delete, or make real with `@AGENTS.md` import? (0.6)
- [ ] `guard-bash.js` — delete or repurpose? (4.3)
- [ ] Default `effortLevel` / `alwaysThinkingEnabled` values (2.1)
- [ ] Ship Phases 0–1 alone first, or run 0–3 together?

## Skills / agents to use

- **executor** — drives phases after status flips to `Ready`
- **pre-impl-audit** skill — mandatory for 1.2 (renames every skill path) and 3.1 (rewrites every description); both are contract changes with multiple consumers
- **compounder** — capture the symlink-vs-copy decision into `docs/solutions/`
- **memory-updater** via `/end-session` after each phase
</content>
