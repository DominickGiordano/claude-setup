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

This **symlinks** `global/` into `~/.claude/`:
- **14 agents** — researcher, brainstorm, planner, orchestrator, executor, dispatcher, code-reviewer, compounder, debugger, memory-updater, meta-agent, and three domain specialists
- **16 slash commands** — `/fix`, `/plan`, `/execute`, `/work-issue`, `/issue`, `/status`, `/commit`, `/pr`, and more
- **24 skills** — Python/FastAPI, Elixir/Phoenix/Ash, Graph API, Docker/Traefik, Anthropic SDK, and more
- **3 hooks** — file change tracking, session-end logging, bash + PR-base safety guard

Run `claude-setup help` any time for the live list — it reads the files, so it can't go stale.

Because these are symlinks, editing anything in `global/` takes effect immediately in your next message. There is one copy on disk, so the repo and `~/.claude/` can't drift apart.

Options: `--force` (replace an existing copy-based install, with backups), `--dry-run` (preview), `--skip-projects` (don't also push templates into repos listed in `~/.claude/.projects`), `--unlink` (go back to plain copies).

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
├── features/                ← one folder per feature (RESEARCH, BRAINSTORM, PLAN, EXECUTION_LOG)
├── solutions/               ← pattern docs from the compounder agent
├── reference/               ← system docs (commands, agents, workflows, file structure)
├── workflows/               ← workflow walkthroughs with examples
└── architecture.md          ← system design doc
```

**If your project has the old structure** (`docs/plans/`, `docs/spikes/`), init will auto-migrate files to `docs/features/` for you.

Then start Claude Code and let it draft the project context for you:

```bash
claude
/init
```

`/init` reads the codebase and proposes a `CLAUDE.md` with build commands, layout, and conventions it discovers. Edit it afterwards to add the things it can't infer — the `## Project Config` block (`base_branch`, `test_commands`, `pm_tool`) and any conventions that differ from tool defaults. **This is the most important file** — it's what Claude reads at the start of every session.

Run `/audit-config` later to check its size and flag stale content.

---

## Step 6 — Learn the Three Workflows

### Quick Fix (bug fix, small change, < 30 min)
```
/fix [description]
```
Reads context → implements the fix → runs tests → runs review → done. No plan doc needed.

### Single Feature (most daily work)
```
/research [topic]       ← optional: investigate unfamiliar tech first
/brainstorm [topic]     ← explore 2-3 approaches
/plan [chosen option]   ← writes docs/features/[feature]/PLAN.md
/execute [feature]      ← delegation preview → you approve → Claude builds it
/end-session            ← log what happened
```

All artifacts land in one folder: `docs/features/[feature-name]/`

### Epic (multi-feature work)
```
/brainstorm [epic]      ← architecture-level exploration
/plan [epic]            ← high-level plan with sub-features
/orchestrate [epic]     ← creates sub-feature folders + shows dependency order
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
| `researcher` | Tech investigation → `RESEARCH.md` | `/research [topic]` |
| `brainstorm` | Explores options, converges to 2-3 | `/brainstorm [topic]` |
| `planner` | Writes plan docs | `/plan [topic]` |
| `orchestrator` | Breaks epics into feature folders | `/orchestrate [epic]` |
| `executor` | Builds from plan docs, logs to `EXECUTION_LOG.md` | `/execute [feature]` |
| `code-reviewer` | Quality, security, correctness review | Auto after execute, or `/code-review` |
| `compounder` | Captures patterns into solution docs | "compound this pattern" |
| `debugger` | Root cause analysis | "debug this" / "why is X broken" |
| `memory-updater` | Session summaries + updates CLAUDE.md | `/end-session` |
| `meta-agent` | Creates new agents | "create an agent that does X" |

**Key rule**: The executor won't touch a plan with status `Draft`. Review the plan, then set status to `Ready`.

For full details, check `docs/reference/agents.md` in any initialized project.

---

## Step 8 — All Commands Reference

Don't memorise a list — print the live one. It's generated from `global/skills/`, so it always matches what's actually installed:

```bash
claude-setup help
```

That prints three sections: slash commands you invoke, skills Claude loads on its own, and the agents it delegates to.

The five you'll use daily:

| Command | Does |
|---------|------|
| `/fix [description]` | Quick fix — implement, test, review in one shot |
| `/plan [topic]` | Write plan doc → `docs/features/[feature]/PLAN.md` |
| `/execute [feature]` | Delegation preview → execute with audit trail |
| `/work-issue [#]` | Full dev cycle on a GitHub issue |
| `/end-session` | Log session, update Current Focus, clear dirty-files |

For decision trees on which pipeline to use, see `docs/reference/workflows.md` in any initialized project.

---

## Step 9 — Daily Habits

### Start of session
```
/catchup
```
Loads last session context — what was in flight, what's next. If it feels stale (you forgot `/end-session` last time), run `/sync-memory` first.

### During session
- Use `/fix`, `/plan`, `/execute` as needed
- Ask the `compounder` agent to capture anything worth preserving across sessions
- Run `/code-review` before committing; run the project's test command to verify
- Use `/commit` when ready to save progress
- Run `/status` to see what's in flight across all features

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

To migrate existing projects to the new `docs/features/` structure:

```bash
cd /your/project
init-claude-setup --migrate-only --dry-run  # preview what would change
init-claude-setup --migrate-only            # do it
```

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

- **Reference docs**: `docs/reference/` in any initialized project (commands, agents, workflows, file structure)
- **Workflow docs**: `docs/workflows/` in any initialized project (step-by-step with examples)
- **Skills reference**: `~/.claude/skills/` (global) and `.claude/skills/` (project)
- **Ask Claude**: "how does X work in this setup" — it can read the reference and workflow docs
- **Improve the system**: Use the meta-agent to create new agents/skills, then open a PR

---

## What Good Looks Like

After a few sessions you should have:
- `docs/features/` with folders showing the full lifecycle of each piece of work
- `docs/solutions/` with patterns captured by the compounder agent
- `.claude/memory/session-log.md` with a running log of what was built
- `.claude/CLAUDE.md` with an accurate "Current Focus" section
- PRs with clear plan docs linked as context

The system gets smarter as you use it. Add skills when you find yourself re-explaining patterns. Add agents when you see repeated workflows. Ask the compounder agent to capture patterns worth preserving. Use the meta-agent — it's what it's there for.
