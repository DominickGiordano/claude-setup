# Claude Code Setup — Areté Capital Partners

Dominick's Claude Code configuration for Areté. Gives every dev a shared, consistent AI workflow out of the box — same agents, same commands, same memory patterns.

---

## What This Gives You

- **Three workflows** — `/fix` for quick changes, brainstorm → plan → execute for features, orchestrate for epics.
- **14 agents** — planner, executor, orchestrator, reviewer, compounder, debugger, and more. Each with a single job.
- **21 skills** — Python/FastAPI, Elixir/Phoenix, Graph API, Docker/Traefik, Anthropic SDK, and more.
- **Persistent memory** — session logs, pattern docs, and plan history that survive between sessions.
- **Project scaffolding** — `.claude/` and `docs/` structure ready to go in any repo.
- **Reference docs** — commands, agents, workflows, and file structure documented in every project.

---

## Install

**First time? See [ONBOARDING.md](./ONBOARDING.md) for a detailed walkthrough with prerequisites.**

### From scratch (new machine)
```bash
# 1. Install Claude Code (requires Node.js >= 18)
npm install -g @anthropic-ai/claude-code

# 2. Clone this repo
git clone <repo-url>
cd claude-setup

# 3. Add CLI commands to your PATH (one-time)
bash setup.sh
# If prompted, add ~/.local/bin to PATH:
#   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc

# 4. Deploy global config to ~/.claude/
install-claude-setup

# 5. Initialize any project
cd /your/project
init-claude-setup
claude
/setup                        # interactive project setup
```

### Two commands — know the difference

| Command | What it does | Scope | Safe to re-run? |
|---------|-------------|-------|-----------------|
| `install-claude-setup` | Syncs global config (`~/.claude/`) — commands, agents, skills, CLAUDE.md | Your machine | Yes, `--force` backs up before overwriting |
| `init-claude-setup` | Scaffolds `.claude/` + `docs/` in the **current project** | One repo | Yes, skips existing files. **Never overwrites CLAUDE.md** (even with `--force`) |

**Updating global config** (after pulling new changes):
```bash
cd /path/to/claude-setup
git pull
install-claude-setup --force  # updates ~/.claude/ with backups in ~/.claude/.backups/
```

**Scaffolding a new project**:
```bash
cd /your/project
init-claude-setup             # creates .claude/, docs/, etc.
```

**Migrating existing projects** (old docs/plans/ + docs/spikes/ structure):
```bash
cd /your/project
init-claude-setup             # auto-detects and migrates old structure
# or preview first:
init-claude-setup --dry-run
# or migrate without scaffolding new files:
init-claude-setup --migrate-only
```

Options: `--force` (overwrite with backups, except CLAUDE.md), `--dry-run` (preview changes), `--migrate-only` (just migrate old structure)

---

## Project Config

Global commands (`/work-issue`, `/board`, `/backlog`, `/update-issue`) adapt to each project by reading a `## Project Config` block in the project's `.claude/CLAUDE.md`:

```yaml
pm_tool: github-projects                 # github-projects | none
base_branch: develop                     # branch all work starts from
test_commands:
  - python -m pytest tests/ -x -q

# GitHub Projects integration (only if pm_tool: github-projects)
github_project_number: 1                 # gh project list --owner <org> to find it
github_project_statuses: [Backlog, Ready, In Progress, In Review, Done]
```

No config? Commands degrade gracefully — no project board means PM steps are skipped, no test commands means Claude asks.

---

## CI Issue Triage

Template GitHub Action in `project-template/.github/workflows/claude-issues.yml`. Triggers on new issues or `@claude` in comments. Claude triages, labels, creates a branch, and optionally adds to a GitHub Project board — all config-driven from Project Config.

To add to a repo:
1. Copy `project-template/.github/workflows/claude-issues.yml` to your repo
2. Copy `project-template/.claude/prompts/ci-triage.md` to your repo
3. Add `DEV_ANTHROPIC_API_KEY` to repo secrets
4. Make sure your CLAUDE.md has a `## Project Config` block

---

## Daily Workflow

### Quick fix (small tasks, < 30 min)

```
/fix [description]          read → implement → test → review → done
```

### Single feature

```
/brainstorm [topic]         explore approaches, get 2-3 options
/plan [chosen option]       writes docs/features/[feature]/PLAN.md
/execute [feature-name]     delegation preview → you approve → build
/end-session                logs learnings, clears dirty-files
```

### Epic (multi-feature work)

```
/brainstorm [epic topic]    same as above, but at system/architecture level
/plan [epic]                writes high-level epic plan with sub-features
/orchestrate [epic]         creates feature folders, shows dependency order
                            asks how to run: sequential / parallel / manual
/execute [feature]          run each feature plan when ready
/end-session
```

All artifacts for a feature live together in `docs/features/[name]/`:
```
docs/features/my-feature/
├── RESEARCH.md             ← from /research (optional)
├── BRAINSTORM.md           ← from /brainstorm (optional)
├── PLAN.md                 ← from /plan
└── EXECUTION_LOG.md        ← from /execute (auto-generated audit trail)
```

Full walkthroughs with examples: `docs/workflows/feature-workflow.md` and `docs/workflows/epic-workflow.md`

---

## Agents

| Agent | Job | Invoke |
|-------|-----|--------|
| `researcher` | Tech investigation → `docs/features/[topic]/RESEARCH.md` | `/research [topic]` |
| `brainstorm` | Explores options, converges to 2-3 → `docs/features/[topic]/BRAINSTORM.md` | `/brainstorm [topic]` |
| `planner` | Writes `docs/features/[feature]/PLAN.md`, reads brainstorm + research docs automatically | `/plan [topic]` |
| `orchestrator` | Breaks epic into feature folders, shows dependency order | `/orchestrate [epic]` |
| `executor` | Delegation preview → execute → logs to `EXECUTION_LOG.md` | `/execute [feature]` |
| `code-reviewer` | Reviews for quality, security, correctness | Auto after execute, or explicit |
| `compounder` | Captures patterns into reusable solution docs | `/compound [pattern]` |
| `debugger` | Root cause analysis | "debug this" / "why is X broken" |
| `memory-updater` | Session log + updates `CLAUDE.md` Current Focus | `/end-session` |
| `meta-agent` | Builds new agents from a description | "use meta-agent to create..." |

**Key rule**: executor won't touch a plan with status `Draft`. Set to `Ready` after you review it.

---

## Slash Commands

| Command | Does |
|---------|------|
| `/fix [description]` | Quick fix — implement, test, review in one shot |
| `/research [topic]` | Research doc → `docs/features/[topic]/RESEARCH.md` |
| `/brainstorm [topic]` | Explore options → `docs/features/[topic]/BRAINSTORM.md` |
| `/plan [topic]` | Write plan doc → `docs/features/[feature]/PLAN.md` |
| `/orchestrate [epic]` | Break epic into feature folders |
| `/execute [feature]` | Delegation preview → execute with audit trail |
| `/compound [pattern]` | Document a pattern → `docs/solutions/[category]/[name].md` |
| `/review` | Review + auto-fix changed code |
| `/test` | Run tests, diagnose + fix failures |
| `/commit` | Stage + commit with structured message |
| `/pr` | Prepare pull request description |
| `/status` | Show all features with status + docs present |
| `/sync-memory` | Backfill session-log from git when /end-session was skipped |
| `/catchup` | Resume context from last session |
| `/end-session` | Log session, update Current Focus, clear dirty-files |
| `/work-issue [#]` | Full dev cycle: load issue → checkout → analyze → code → test → commit → update issue |
| `/board` | View project board (GitHub Projects or Issues fallback) |
| `/backlog [desc]` | Create GitHub issue + branch + add to project board |
| `/update-issue [# or name]` | Update issue: post comment, change status, move on board |
| `/audit-config` | Health check — CLAUDE.md size, stale content, missing rules |
| `/setup` | Interactive project setup for new devs |

## Skills

Skills are reference docs Claude uses when writing code. They're not auto-loaded — Claude invokes them when relevant, or you can `@`-reference explicitly.

| Skill | Use for |
|-------|---------|
| `anthropic-api` | Anthropic SDK patterns (TS + Python), streaming, tool_use |
| `python` | Python 3.11+, FastAPI, pydantic v2, httpx, aiosqlite |
| `microsoft-graph` | Graph API — mail, webhooks, MSAL auth, permissions |
| `docker-deploy` | Docker Compose + Traefik, health checks, SSL, blue/green deploy |
| `elixir` | Elixir modules, GenServer, OTP, Ecto |
| `phoenix` | Phoenix controllers, LiveView, plugs, router |
| `terraform` | IaC patterns, state config, safe resource patterns |
| `mcp` | MCP server/client patterns (TypeScript + Python) |
| `ts-component` | React/TypeScript component templates |
| `api-route` | Next.js API routes and server actions |
| `nodejs` | Node.js async, error handling, module patterns |
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

`session-log.md` is gitignored — it's personal to your machine. Feature docs in `docs/features/` are versioned and shared.

---

## File Structure

```
~/.claude/                      ← global, applies to every project
├── CLAUDE.md                   ← your identity, stack defaults, workflow rules
├── settings.json               ← hooks + permissions config
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
│   ├── rules/                 ← path-scoped rules (load per file match)
│   └── memory/
│       ├── session-log.md      ← session history (gitignored)
│       └── dirty-files         ← changed files buffer (gitignored)
└── docs/
    ├── features/               ← one folder per feature/initiative
    │   └── [feature-name]/
    │       ├── RESEARCH.md     ← from /research (optional)
    │       ├── BRAINSTORM.md   ← from /brainstorm (optional)
    │       ├── PLAN.md         ← from /plan
    │       └── EXECUTION_LOG.md ← from /execute (auto-generated)
    ├── solutions/              ← pattern docs from /compound (institutional memory)
    │   └── [category]/[pattern].md
    ├── reference/              ← system docs (commands, agents, workflows, file structure)
    │   ├── commands.md
    │   ├── agents.md
    │   ├── workflows.md
    │   └── file-structure.md
    ├── workflows/              ← workflow walkthroughs (human + Claude reference)
    │   ├── feature-workflow.md
    │   ├── epic-workflow.md
    │   └── research-workflow.md
    └── architecture.md         ← system design (ad-hoc, @-reference when needed)
```

---

## Tips

**Keep `.claude/CLAUDE.md` current.** It's what Claude knows about your project at session start. If it's stale, Claude will make wrong assumptions. Takes 2 minutes to update — do it.

**Feature docs are the record of decisions.** Don't delete them when a feature is done — set status to `Done`. They're useful context for future sessions and new devs.

**The `#` shortcut saves memory fast.** In Claude Code, type `# [thing to remember]` and it saves to the most relevant memory file instantly.

**Project agents override global ones.** If you need different reviewer behavior for a specific project, drop a `code-reviewer.md` in `.claude/agents/` and it takes precedence.

**Add skills as patterns emerge.** Every time you find yourself explaining the same pattern to Claude, that's a skill. Use the meta-agent to create it.

**Reference docs are your wiki.** Every project gets `docs/reference/` with commands, agents, workflows, and file structure docs. `@`-reference them when needed.

---

## Adding to the System

**New agent**: Use the meta-agent — `"use meta-agent to create an agent that [does X]"` — or manually add a `.md` to `~/.claude/agents/` (global) or `.claude/agents/` (project).

**New skill**: Add a `.md` to `~/.claude/skills/` or `.claude/skills/`. Describe when to use it in the frontmatter `description` field.

**New slash command**: Add a `.md` to `~/.claude/commands/` or `.claude/commands/`. File name = command name.
