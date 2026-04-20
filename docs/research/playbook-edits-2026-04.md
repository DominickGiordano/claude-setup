# Playbook Edits — 2026-04-20

Drafted updates to reflect Claude Code v2.1 reality + gaps found against actual setup (43 skills, 14 agents, hooks live in `~/.claude/settings.json`).

---

## REPLACE §1 — "When to Build a Skill vs. Command vs. Just Prompt"

### 1. When to Build a Skill vs. Hook vs. Just Prompt

As of Claude Code v2.1, **slash commands are skills**. A file in `~/.claude/skills/foo/SKILL.md` is invokable both by natural language ("help me plan X") and as `/foo`. The old "commands vs skills" split is gone — there's one layer.

| Signal | Use |
|---|---|
| Multi-step workflow, same outcome every time | **Skill** (invokable as `/name` if I want manual control) |
| Behavior that must fire **automatically** on an event (PreToolUse, Stop, SessionStart, etc.) | **Hook** in `settings.json` |
| Repo- or directory-specific ambient context | **`CLAUDE.md`** |
| Cross-session facts about me, the project, or feedback | **Auto-memory** (`MEMORY.md` + typed memory files) |
| One-off task | Just prompt |

**Key distinction:** memory/CLAUDE.md can tell Claude *what to do* — only hooks can *make the harness do it*. "Whenever I stop, run X" → hook. "When I mention Y, suggest Z" → skill or memory.

**Rule of thumb:** if I'm re-explaining the same thing, stop and extract it.
- Re-explaining a workflow → skill
- Re-explaining a rule → CLAUDE.md or feedback memory
- Re-running the same command manually after every edit → hook

### Candidates with existing evidence
_(unchanged — keep the current list)_

---

## REPLACE §5 — "The Pipeline — How Skills Fit In"

### 5. The Pipeline — How Skills Fit In

Existing flow: `/research → /brainstorm → /plan → /execute → /end-session` with a `Draft → Ready` status gate. Each stage is itself a skill (in `~/.claude/skills/`), not a separate command layer.

Where additional skills plug in alongside the pipeline:

| Stage skill | Supporting skills that do the heavy lifting |
|---|---|
| `/research` | `anthropic-api`, `mcp`, domain-specific research skills |
| `/brainstorm` | Mostly unstructured — supporting skills rarely help |
| `/plan` | Scaffolding skills: `terraform`, `api-route`, `ts-component`, `phoenix` |
| `/execute` | The bulk — `backend-standards`, `frontend-standards`, `infra-standards`, `testing`, `logging`, `env-config` |
| `/end-session` | `commit`, `pr`, `compound`, `sync-memory` |

The stage skill sets the phase; it may invoke or reference supporting skills for the specific shape of work.

**Prune signal:** I currently run ~43 skills. Past 20–50, context suffers. Monthly `/audit-config` should drop any skill that hasn't fired in 30 days.

---

## INSERT new §6.5 — "Hooks & `settings.json`"

### 6.5. Hooks and `settings.json`

`settings.json` is the harness's config. Skills/memory tell Claude what to do; **hooks tell the harness to run things**. They're the only way to get "whenever X happens" behavior.

Current global hooks (`~/.claude/settings.json`):

| Event | Hook | Purpose |
|---|---|---|
| `SessionStart` (matcher: `compact`) | echo reminder | Re-prime context after compaction |
| `Stop` | `session-end.js` | Close-of-session bookkeeping |
| `PostToolUse` (Edit\|Write) | `track-changes.js` | Log dirty files for memory updater |
| `PreToolUse` (Bash) | `guard-bash.js` | Block/warn on risky bash before it runs |

**When to add a hook, not a skill:**
- The behavior must be *guaranteed*, not just remembered — e.g. format on save, guard a risky command
- It needs to inspect tool input/output, not just conversation text
- It must happen without me typing anything

**Other `settings.json` levers worth knowing:**
- `model` / `subagentModel` — split main agent (Opus) from subagents (Sonnet) for cost
- `permissions.deny` — hard blocks (already covers rm -rf, force push, reset --hard, .env reads)
- `permissions.allow` — allowlist for common bash to reduce prompts (`/fewer-permission-prompts` skill auto-generates these from transcripts)

**Management:** use the `update-config` skill for any change to `settings.json` or hooks — don't hand-edit when a skill understands the schema.

---

## INSERT new §6.6 — "Auto-Memory"

### 6.6. Auto-Memory (`MEMORY.md` + typed memory files)

Lives at `~/.claude/projects/<project-slug>/memory/`. Separate from `CLAUDE.md` and from `.claude/memory/session-log.md`.

Four memory types:

| Type | Use for |
|---|---|
| `user` | Role, preferences, domain knowledge about me |
| `feedback` | "Stop doing X" / "keep doing Y" — rules with a *why* and *how to apply* |
| `project` | Time-bound facts: deadlines, incidents, active initiatives (use absolute dates) |
| `reference` | Pointers to external systems (Linear, Grafana, Slack channels) |

**Not** for: code conventions (derive from code), git history (use `git log`), CLAUDE.md duplicates.

`MEMORY.md` is an always-loaded index — one-line pointers only, never content.

**Relationship to `CLAUDE.md`:**
- CLAUDE.md = rules that apply every session (voice, stack, non-negotiables)
- Auto-memory = evolving context that changes over time (current project state, lessons learned, validated preferences)

---

## EDITS to §2 — "Skill Anatomy"

### Fix the reserved-name rule

**Remove:**
> No `claude` or `anthropic` in the name (reserved)

**Replace with:**
> Don't name a skill exactly `claude` or `anthropic`. Prefixed names like `anthropic-api` are fine.
> (Evidence: `anthropic-api` skill is live and working.)

---

## EDITS to §7 — "Patterns Worth Stealing"

### Add a new pattern

**Worktree isolation for risky agent work**

Good fit for: large refactors, risky migrations, anything where the agent might leave the tree in a bad state. Pass `isolation: "worktree"` when spawning via `Agent`. The agent gets a throwaway git worktree; merged back only if changes are wanted. Prevents half-done refactors from polluting `main`.

---

## NEW §11 — "30-Day Cleanup List (as of 2026-04-20)"

Ad-hoc TODOs from this audit:

- [ ] Audit 43 global skills → kill anything not fired in 30 days (`/audit-config`)
- [ ] Decide whether `output-styles/` dir should hold anything (currently empty)
- [ ] Verify `commands/` dir is empty and remove if so (v2.1 migration leftover)
- [ ] Confirm all session logs rotate — `file-history/` has 62 entries
- [ ] Review `plugins/` dir — 8 entries, not mentioned anywhere in current playbook
- [ ] Add `update-config` skill usage note to CLAUDE.md so I stop hand-editing `settings.json`
