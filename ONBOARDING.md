# Onboarding — Claude Code @ Areté

New to Claude Code at Areté? Start here. This gets you from zero to productive in one session.

---

## Step 1 — Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
claude --version  # verify
```

Requires Node.js >= 18. If you don't have it: `brew install node`.

---

## Step 2 — Deploy the Global Config

Clone this repo, set up PATH, and install:

```bash
git clone [this repo]
cd claude-setup

# One-time: symlink bin/ commands to ~/.local/bin/
bash setup.sh

# Deploy global config to ~/.claude/
install-claude-setup
```

Options: `--force` (overwrite with backups), `--dry-run` (preview changes).

This copies everything in `global/` to `~/.claude/` — 10 agents, 16 commands, 17 skills, 3 hooks.

---

## Step 3 — Update Your Identity

Open `~/.claude/CLAUDE.md` and update:
- Your name
- Your role
- Any stack differences from the defaults

The rest (workflow rules, code defaults, agents) is shared — don't change those unless you're intentionally updating team standards.

---

## Step 4 — Init Your Project

Navigate to your project and run:

```bash
cd /your/project
/path/to/claude-setup/bin/init-claude-setup
```

Then open Claude Code and run `/setup` — it walks you through filling in the project `CLAUDE.md` interactively.

```bash
claude
/setup
```

---

## Step 5 — Understand the Workflow

There are three pipelines depending on scope:

**Quick fix** (bug fix, small change, < 30 min):
```
/fix [description]  ← implement, test, review in one shot
```

**Single feature** (most work):
```
/research [topic]   ← optional, for unfamiliar tech
/brainstorm [topic] ← explore options
/plan [option]      ← write the plan doc
/execute [feature]  ← build it
/end-session        ← log what happened
```

**Epic (multi-feature)**:
```
/brainstorm [epic]     ← architecture-level options
/plan [epic]           ← high-level plan with sub-features
/orchestrate [epic]    ← creates feature plan stubs + dependency order
/plan each stub        ← flesh out each feature plan
/execute each feature  ← build them
/end-session
```

Full walkthroughs with examples:
- `docs/workflows/feature-workflow.md`
- `docs/workflows/epic-workflow.md`
- `docs/workflows/research-workflow.md`

---

## Step 6 — Learn the Agents

You don't invoke most agents directly — Claude delegates automatically based on what you ask. But knowing what exists helps you work with the system:

| Agent | Triggered by |
|-------|-------------|
| `researcher` | `/research [topic]` |
| `brainstorm` | `/brainstorm [topic]` |
| `planner` | `/plan [topic]` |
| `orchestrator` | `/orchestrate [epic]` |
| `executor` | `/execute [feature]` |
| `code-reviewer` | Auto after execute, or "review this" |
| `compounder` | `/compound [pattern]` |
| `debugger` | "debug this error" / "why is X broken" |
| `memory-updater` | `/end-session` |
| `meta-agent` | "create an agent that does X" |

---

## Step 7 — Daily Habits

**Start every session:**
```
/catchup
```
Loads last session context — what was in flight, what's next.

If memory feels stale (skipped `/end-session` last time):
```
/sync-memory
```
Backfills session-log from git history and updates current focus.

**End every session:**
```
/end-session
```
Logs what was built, decisions made, next steps. Updates `CLAUDE.md` current focus. Takes 30 seconds and saves 10 minutes next session.

**Capture a pattern mid-session:**
```
/compound [description of what you learned]
```
Saves to `docs/solutions/` — builds institutional memory across sessions.

**Check plan status:**
```
/status
```
Shows all plan docs with their current status.

**Quick memory save:**
Type `# [thing to remember]` anywhere in Claude Code — saves to the most relevant memory file instantly.

---

## Secrets — Always Infisical

See the `infisical` skill (`@skills/infisical.md`) for full patterns. Short version:

```bash
infisical login           # one time
infisical run --env=dev -- npm run dev   # dev with secrets
```

Never commit `.env` files. Never hardcode secrets. Infisical only.

---

## Getting Help

- Workflow docs: `docs/workflows/`
- Skills reference: `~/.claude/skills/` and `.claude/skills/`
- Stuck on something? Ask Claude: "how does X work in this setup" — it can read the workflow docs
- Want to improve the system? Use the meta-agent and open a PR

---

## What Good Looks Like

After a few sessions you should have:
- `docs/plans/` with plan docs that show your decision history
- `docs/spikes/` with research that informed those decisions
- `docs/solutions/` with patterns captured via `/compound`
- `.claude/memory/session-log.md` with a running log of what was built
- `.claude/CLAUDE.md` with an accurate "Current Focus" section
- PRs with clear plan docs linked as context

The system gets smarter as you use it. Add skills when you find yourself re-explaining patterns. Add agents when you see repeated workflows. Use `/compound` to capture patterns worth preserving. Use the meta-agent — it's what it's there for.
