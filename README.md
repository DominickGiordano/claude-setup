# Claude Code Setup — Areté Capital Partners

Dominick's Claude Code configuration for Areté. Gives every dev a shared, consistent AI workflow out of the box — same agents, same commands, same memory patterns.

---

## What This Gives You

- **A workflow** — brainstorm → plan doc → execute → session memory. Not just "ask Claude things."
- **Shared agents** — planner, executor, orchestrator, reviewer, debugger. Each with a single job.
- **Persistent memory** — session logs that survive between Claude Code sessions.
- **Project scaffolding** — `.claude/` and `docs/` structure ready to go in any repo.

---

## Install

**New to this system? See [ONBOARDING.md](./ONBOARDING.md) for a full step-by-step guide.**

### Quick install
```bash
bash install.sh          # deploy global config to ~/.claude
bash init-project.sh     # scaffold .claude/ in a project (run from project root)
claude && /setup         # interactive project setup
```

---

## Daily Workflow

### Single feature

```
/brainstorm [topic]         explore approaches, get 2-3 options
/plan [chosen option]       writes docs/plans/[feature].md
/execute [feature-name]     delegation preview → you approve → build
/end-session                logs learnings, clears dirty-files
```

### Epic (multi-feature work)

```
/brainstorm [epic topic]    same as above, but at system/architecture level
/plan [epic]                writes high-level epic plan with sub-features
/orchestrate [epic]         creates feature plan docs, shows dependency order
                            asks how to run: sequential / parallel / manual
/execute [feature]          run each feature plan when ready
/end-session
```

Full walkthroughs with examples: `docs/workflows/feature-workflow.md` and `docs/workflows/epic-workflow.md`

---

## Agents

| Agent | Job | Invoke |
|-------|-----|--------|
| `researcher` | Tech spikes → `docs/spikes/[topic].md` | `/research [topic]` |
| `brainstorm` | Explores options, converges to 2-3, saves to `docs/plans/[topic]-brainstorm.md` | `/brainstorm [topic]` |
| `planner` | Writes `docs/plans/[feature].md`, reads brainstorm + spike docs automatically | `/plan [topic]` |
| `orchestrator` | Breaks epic into feature plan stubs, shows dependency order | `/orchestrate [epic]` |
| `executor` | Delegation preview → execute → handles `Blocked` status + resume | `/execute [feature]` |
| `code-reviewer` | Reviews for quality, security, correctness | Auto after execute, or explicit |
| `debugger` | Root cause analysis | "debug this" / "why is X broken" |
| `memory-updater` | Session log + updates `CLAUDE.md` Current Focus | `/end-session` |
| `meta-agent` | Builds new agents from a description | "use meta-agent to create..." |

**Key rule**: executor won't touch a plan with status `Draft`. Set to `Ready` after you review it.

---

## Slash Commands

| Command | Does |
|---------|------|
| `/research [topic]` | Spike doc → `docs/spikes/[topic].md` |
| `/brainstorm [topic]` | Explore options → `docs/plans/[topic]-brainstorm.md` |
| `/plan [topic]` | Write plan doc → `docs/plans/[feature].md` |
| `/orchestrate [epic]` | Break epic into feature plan stubs |
| `/execute [feature]` | Delegation preview → execute |
| `/catchup` | Resume context from last session |
| `/end-session` | Log session, update Current Focus, clear dirty-files |
| `/pr` | Prepare pull request description |
| `/setup` | Interactive project setup for new devs |

## Skills

Skills are reference docs Claude uses when writing code. They're not auto-loaded — Claude invokes them when relevant, or you can `@`-reference explicitly.

| Skill | Use for |
|-------|---------|
| `ts-component` | React/TypeScript component templates |
| `api-route` | Next.js API routes and server actions |
| `anthropic-api` | Anthropic SDK patterns, models, streaming |
| `mcp` | MCP server/client patterns (TypeScript + Python) |
| `nodejs` | Node.js async, error handling, module patterns |
| `python` | Python 3.11+, pydantic, async, ruff |
| `elixir` | Elixir modules, GenServer, OTP, Ecto |
| `phoenix` | Phoenix controllers, LiveView, plugs, router |
| `terraform` | IaC patterns, state config, safe resource patterns |
| `infisical` | Secrets management, CLI, SDK integration |
| `testing` | Jest, pytest, ExUnit patterns per language |
| `error-handling` | Typed errors, result patterns, API error shapes |
| `env-config` | Config validation, multi-env, `.env` patterns |
| `database` | Ecto, Prisma, migrations, safe query patterns |
| `logging` | Structured logging with pino, structlog, Logger |

---

## Memory & Session Continuity

Claude has no memory between sessions by default. This setup adds it:

- **`PostToolUse` hook** — every file edit is logged to `.claude/memory/dirty-files`
- **`Stop` hook** — appends a session stub to `.claude/memory/session-log.md` on close
- **`/end-session`** — runs the memory-updater agent to write a proper summary (what was built, decisions, next steps)
- **`/catchup`** — reads `session-log.md` at session start to restore context

`session-log.md` is gitignored — it's personal to your machine. Plan docs in `docs/plans/` are versioned and shared.

---

## File Structure

```
~/.claude/                      ← global, applies to every project
├── CLAUDE.md                   ← your identity, stack defaults, workflow rules
├── settings.json               ← hooks config
├── agents/                     ← shared agents (all projects)
├── skills/                     ← shared skills (all projects)
├── commands/                   ← slash commands
└── hooks/                      ← session-end.js, track-changes.js, guard-bash.js

[project]/
├── .claude/                    ← project-specific, overrides global
│   ├── CLAUDE.md               ← project stack, commands, gotchas ← KEEP THIS CURRENT
│   ├── settings.json           ← project-level hooks
│   ├── agents/                 ← project agents (override global by name)
│   ├── skills/                 ← project skills
│   ├── commands/               ← project commands
│   └── memory/
│       ├── session-log.md      ← session history (gitignored)
│       └── dirty-files         ← changed files buffer (gitignored)
└── docs/
    ├── architecture.md         ← system design (ad-hoc, @-reference when needed)
    ├── plans/                  ← plan docs (versioned, in git)
    │   ├── [feature].md
    │   └── [epic].md
    └── workflows/              ← workflow walkthroughs (human + Claude reference)
        ├── feature-workflow.md
        └── epic-workflow.md
```

---

## Tips

**Keep `.claude/CLAUDE.md` current.** It's what Claude knows about your project at session start. If it's stale, Claude will make wrong assumptions. Takes 2 minutes to update — do it.

**Plan docs are the record of decisions.** Don't delete them when a feature is done — set status to `Done`. They're useful context for future sessions and new devs.

**The `#` shortcut saves memory fast.** In Claude Code, type `# [thing to remember]` and it saves to the most relevant memory file instantly.

**Project agents override global ones.** If you need different reviewer behavior for a specific project, drop a `code-reviewer.md` in `.claude/agents/` and it takes precedence.

**Add skills as patterns emerge.** Every time you find yourself explaining the same pattern to Claude, that's a skill. Use the meta-agent to create it.

---

## Adding to the System

**New agent**: Use the meta-agent — `"use meta-agent to create an agent that [does X]"` — or manually add a `.md` to `~/.claude/agents/` (global) or `.claude/agents/` (project).

**New skill**: Add a `.md` to `~/.claude/skills/` or `.claude/skills/`. Describe when to use it in the frontmatter `description` field.

**New slash command**: Add a `.md` to `~/.claude/commands/` or `.claude/commands/`. File name = command name.
