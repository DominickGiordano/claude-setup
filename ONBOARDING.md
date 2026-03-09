# Onboarding — Claude Code @ Areté

New to Claude Code at Areté? Start here. This gets you from zero to productive in one session.

---

## Prerequisites

You need these installed before starting:

| Tool | Install | Verify |
|------|---------|--------|
| **Node.js** (>= 18) | `brew install node` | `node --version` |
| **Claude Code** | `npm install -g @anthropic-ai/claude-code` | `claude --version` |
| **Git** | Already installed on macOS | `git --version` |

Optional (for specific project stacks):
- **Python 3.11+**: `brew install python@3.12`
- **Elixir**: `brew install elixir`
- **Terraform**: `brew install terraform`

---

## Step 1 — Clone This Repo

```bash
git clone <this-repo-url>
cd claude-setup
```

This repo contains all shared agents, commands, skills, and hooks. You'll pull updates from it over time.

---

## Step 2 — Set Up the CLI Commands

```bash
bash setup.sh
```

This symlinks three commands to `~/.local/bin/` so they work from any directory:
- `install-claude-setup` — deploy global config to `~/.claude/`
- `init-claude-setup` — scaffold a project for Claude Code
- `update-claude-setup` — scan projects and surface improvements

If `setup.sh` tells you `~/.local/bin` is not on your PATH, add it:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

---

## Step 3 — Install the Global Config

```bash
install-claude-setup
```

This copies everything in `global/` to `~/.claude/`:
- **10 agents** — brainstorm, planner, executor, orchestrator, researcher, code-reviewer, compounder, debugger, memory-updater, meta-agent
- **16 commands** — `/fix`, `/brainstorm`, `/plan`, `/execute`, `/compound`, `/review`, `/test`, `/commit`, `/pr`, and more
- **17 skills** — Python/FastAPI, Elixir/Phoenix, Graph API, Docker/Traefik, Anthropic SDK, and more
- **3 hooks** — file change tracking, session-end logging, bash safety guard

Options: `--force` (overwrite existing files, with backups), `--dry-run` (preview without changing anything).

---

## Step 4 — Personalize Your Identity

Open `~/.claude/CLAUDE.md` and update the top section:

```markdown
## Identity
- **Name**: [Your name]
- **Role**: [Your role]
- **Org**: Areté Capital Partners (ACP)
```

Also update the **Stack** section if your daily work differs from the defaults. Everything else (workflow rules, code defaults) is shared — don't change those unless updating team standards.

---

## Step 5 — Initialize Your First Project

Navigate to any project repo and run:

```bash
cd /path/to/your/project
init-claude-setup
```

This creates:
```
.claude/
├── CLAUDE.md               ← project context — YOU fill this in
├── settings.json            ← project hooks
├── agents/                  ← project-specific agents (optional)
├── skills/                  ← project-specific skills (optional)
├── commands/                ← project-specific commands (optional)
└── memory/
    ├── session-log.md       ← session history (gitignored)
    └── dirty-files          ← changed files buffer (gitignored)
docs/
├── architecture.md          ← system design doc
├── plans/                   ← plan docs from /plan
├── spikes/                  ← research docs from /research
├── solutions/               ← pattern docs from /compound
└── workflows/               ← workflow reference docs
```

Then start Claude Code and run the interactive setup:

```bash
claude
/setup
```

This walks you through filling in `.claude/CLAUDE.md` with your project's stack, key paths, and conventions. **This is the most important file** — it's what Claude reads at the start of every session.

---

## Step 6 — Learn the Three Workflows

### Quick Fix (bug fix, small change, < 30 min)
```
/fix [description]
```
Reads context → implements the fix → runs tests → runs review → done. No plan doc needed.

### Single Feature (most daily work)
```
/research [topic]       ← optional: spike doc for unfamiliar tech
/brainstorm [topic]     ← explore 2-3 approaches
/plan [chosen option]   ← write docs/plans/[feature].md
/execute [feature]      ← delegation preview → you approve → Claude builds it
/end-session            ← log what happened
```

### Epic (multi-feature work)
```
/brainstorm [epic]      ← architecture-level exploration
/plan [epic]            ← high-level plan with sub-features
/orchestrate [epic]     ← creates feature plan stubs + shows dependency order
/plan [each feature]    ← flesh out each sub-feature plan
/execute [each feature] ← build them one by one
/end-session
```

**When to use which:**
- Bug fix or config change? → `/fix`
- New feature with clear approach? → Skip brainstorm, go straight to `/plan`
- New feature, unclear approach? → Full pipeline starting with `/brainstorm`
- Large system change? → Epic pipeline with `/orchestrate`

---

## Step 7 — Learn the Agents

You don't invoke agents directly — they're triggered by commands. But knowing what exists helps:

| Agent | What it does | Triggered by |
|-------|-------------|-------------|
| `researcher` | Tech spikes → `docs/spikes/` | `/research [topic]` |
| `brainstorm` | Explores options, converges to 2-3 | `/brainstorm [topic]` |
| `planner` | Writes plan docs | `/plan [topic]` |
| `orchestrator` | Breaks epics into feature plans | `/orchestrate [epic]` |
| `executor` | Builds from plan docs | `/execute [feature]` |
| `code-reviewer` | Quality, security, correctness review | Auto after execute, or `/review` |
| `compounder` | Captures patterns into solution docs | `/compound [pattern]` |
| `debugger` | Root cause analysis | "debug this" / "why is X broken" |
| `memory-updater` | Session summaries + updates CLAUDE.md | `/end-session` |
| `meta-agent` | Creates new agents | "create an agent that does X" |

**Key rule**: The executor won't touch a plan with status `Draft`. Review the plan, then set status to `Ready`.

---

## Step 8 — All Commands Reference

### Workflow Commands
| Command | Does |
|---------|------|
| `/fix [description]` | Quick fix — implement, test, review in one shot |
| `/research [topic]` | Spike doc → `docs/spikes/[topic].md` |
| `/brainstorm [topic]` | Explore options → `docs/plans/[topic]-brainstorm.md` |
| `/plan [topic]` | Write plan doc → `docs/plans/[feature].md` |
| `/orchestrate [epic]` | Break epic into feature plan stubs |
| `/execute [feature]` | Delegation preview → execute |

### Code Quality Commands
| Command | Does |
|---------|------|
| `/review` | Review + auto-fix changed code |
| `/test` | Run tests, diagnose + fix failures |
| `/commit` | Stage + commit with structured message |
| `/pr` | Create pull request with description |

### Knowledge & Memory Commands
| Command | Does |
|---------|------|
| `/compound [pattern]` | Document a pattern → `docs/solutions/[category]/[name].md` |
| `/catchup` | Resume context from last session |
| `/sync-memory` | Backfill session-log from git (when /end-session was skipped) |
| `/status` | Show all plan docs with status + solution counts |
| `/end-session` | Log session, update Current Focus, clear dirty-files |

### Setup Commands
| Command | Does |
|---------|------|
| `/setup` | Interactive project setup for new devs |

---

## Step 9 — Daily Habits

### Start of session
```
/catchup
```
Loads last session context — what was in flight, what's next. If it feels stale (you forgot `/end-session` last time), run `/sync-memory` first.

### During session
- Use `/fix`, `/plan`, `/execute` as needed
- Run `/compound [description]` when you learn something worth preserving
- Run `/review` before committing, `/test` to verify
- Use `/commit` when ready to save progress

### End of session
```
/end-session
```
Takes 30 seconds. Saves 10 minutes next session. Logs what was built, decisions made, and next steps. Updates the `Current Focus` section in `.claude/CLAUDE.md`.

---

## Updating the System

When the setup repo gets new agents, commands, or skills:

```bash
cd /path/to/claude-setup
git pull
install-claude-setup --force
```

`--force` overwrites existing files but creates timestamped backups in `~/.claude/.backups/` first.

---

## Secrets — Always Infisical

See the `infisical` skill (`@skills/infisical.md`) for full patterns. Short version:

```bash
infisical login                            # one time
infisical run --env=dev -- npm run dev     # dev with secrets
```

Never commit `.env` files. Never hardcode secrets. Infisical only.

---

## Getting Help

- **Workflow docs**: `docs/workflows/` in any initialized project
- **Skills reference**: `~/.claude/skills/` (global) and `.claude/skills/` (project)
- **Ask Claude**: "how does X work in this setup" — it can read the workflow docs
- **Improve the system**: Use the meta-agent to create new agents/skills, then open a PR

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
