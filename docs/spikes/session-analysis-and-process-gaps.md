# Spike: Session Analysis and Process Gaps

**Date**: 2026-03-09
**Decision it informs**: What to build/improve next in the claude-setup system
**Status**: Complete

## Question
What skills, agents, workflows, and commands exist today? What patterns emerge from recent sessions? What is missing, outdated, or underperforming?

---

## 1. Current State Inventory

### 1.1 Global Agents (9)
| Agent | Model | Purpose | Status |
|-------|-------|---------|--------|
| `brainstorm` | opus | Explore options, converge to 2-3 | Active, working |
| `planner` | opus | Write plan docs from ideas/brainstorms | Active, working |
| `orchestrator` | opus | Decompose epics into feature plans | Active, working |
| `executor` | sonnet | Execute plan docs with delegation preview | Active, working |
| `researcher` | opus | Tech spikes to docs/spikes/ | Active, working |
| `code-reviewer` | sonnet | Quality/security/correctness review | Active, working |
| `debugger` | sonnet | Root cause analysis | Active, light use |
| `memory-updater` | sonnet | Session summaries to session-log.md | Active, inconsistently used |
| `meta-agent` | opus | Creates new agents | Active, light use |

### 1.2 Global Commands (12)
| Command | Maps to | Notes |
|---------|---------|-------|
| `/brainstorm` | brainstorm agent | Working |
| `/plan` | planner agent | Working |
| `/orchestrate` | orchestrator agent | Working |
| `/execute` | executor agent | Working |
| `/research` | researcher agent | Working |
| `/catchup` | direct (reads session-log) | Working |
| `/end-session` | memory-updater agent | Working but underused |
| `/commit` | direct (git workflow) | New, working |
| `/review` | direct (lint + auto-fix) | New, working |
| `/test` | direct (detect + run tests) | New, working |
| `/pr` | direct (git + description) | Working |
| `/setup` | direct (interactive project setup) | Working |

### 1.3 Global Skills (15)
| Skill | Coverage |
|-------|----------|
| `anthropic-api` | TS SDK patterns, streaming, tools, multi-turn |
| `api-route` | Next.js App Router API routes + server actions |
| `ts-component` | React/TS component templates |
| `mcp` | MCP server/client in TS + Python |
| `nodejs` | Node.js async, error handling, modules |
| `python` | Python 3.11+, pydantic, ruff, async |
| `elixir` | Elixir modules, GenServer, OTP |
| `phoenix` | Phoenix controllers, LiveView, plugs |
| `terraform` | IaC patterns, state management |
| `infisical` | Secrets management |
| `testing` | Jest, pytest, ExUnit patterns |
| `error-handling` | Typed errors, result patterns |
| `env-config` | Config validation, multi-env |
| `database` | Ecto, Prisma, migrations |
| `logging` | Structured logging (pino, structlog, Logger) |

### 1.4 Hooks (3)
| Hook | Trigger | Purpose |
|------|---------|---------|
| `track-changes.js` | PostToolUse (Edit/Write) | Logs changed files to dirty-files |
| `session-end.js` | Stop | Appends session stub to session-log.md |
| `guard-bash.js` | PreToolUse (Bash) | Blocks catastrophic commands (rm -rf /, fork bomb) |

### 1.5 Workflow Docs (3)
- `feature-workflow.md` -- single feature pipeline
- `epic-workflow.md` -- multi-feature decomposition
- `research-workflow.md` -- spike before brainstorm

### 1.6 Project-Specific Agents (arilearn-phx only)
| Agent | Purpose |
|-------|---------|
| `implementor` | Background subagent for coding work (beads-integrated) |
| `code-reviewer` | Overrides global; Ash/Phoenix/daisyUI-specific review |
| `compounder` | Turns review findings into reusable solution docs |

### 1.7 Project-Specific Skills (arilearn-phx)
- `ash-framework` -- Ash resource patterns, references for 5 Ash packages
- `phoenix-framework` -- Phoenix/LiveView/Ecto/HTML references
- `team-lead` -- Coordination skill for 4-agent team workflow

### 1.8 CLI Tools (bin/)
| Tool | Purpose |
|------|---------|
| `install-claude-setup` | Deploy global config to ~/.claude/ |
| `init-claude-setup` | Scaffold .claude/ + docs/ in a project |
| `update-claude-setup` | Scan repos, surface unique configs, --promote to global |

### 1.9 Deployment Sync
Global configs in repo match what's deployed to `~/.claude/`. No drift detected.

---

## 2. Session Patterns (Last 2 Weeks)

### 2.1 Active Projects by Commit Volume
| Project | Commits | Language | Key Work |
|---------|---------|----------|----------|
| arilearn-phx | 256 | Elixir/Phoenix | Assessment system, MCP, OAuth, deploy, UI features |
| clerk-terraform-infrastructure | 43 | Terraform/HCL | Multi-env Clerk IaC |
| bd-tracker | 27 | Python/FastAPI | Email classifier CRM, Graph API integration |
| microsoft-outlook-manager | 19 | TS/React/Python | Outlook email management, SSO |
| terraform-provider-clerk | 13 | Go | Custom Terraform provider |
| arete-website-wordpress | 10 | PHP/WP | WordPress theme updates |
| clerk-poc-spike | 7 | Elixir | Auth strategy evaluation |
| debtwire-mcp | 7 | TS | MCP server for Debtwire API |
| claude-setup | 3 | Bash/MD | This repo -- config management |

### 2.2 Session Count by Project (Claude sessions in ~/.claude/projects/)
| Project | Sessions | Notes |
|---------|----------|-------|
| bd-tracker | 4 | Most active currently, has MEMORY.md + feature-ideas.md |
| claude-setup | 3 | Including this session |
| microsoft-outlook-manager | 3 | |
| microsoft-outlook-python | 5 | |
| clerk-terraform-infrastructure | 3 | |
| clerk-poc-spike | 3 | |
| terraform-provider-clerk | 3 | |
| arete-website-wordpress | 1 | |
| arilearn-phx | 1 (in ~/.claude) | Most work done via beads/usage_rules, not session-log |

### 2.3 Recurring Task Patterns
1. **Deploy + verify cycle** -- arilearn-phx, bd-tracker, outlook-manager all show repeated deploy/fix/redeploy patterns
2. **Code review + fix cycles** -- arilearn-phx has 122 solution docs from review cycles; bd-tracker session logs show review-fix-deploy loops
3. **Auth/SSO integration** -- 4 projects (arilearn-phx, bd-tracker, outlook-manager, clerk-terraform) all deal with Microsoft Entra/Clerk auth
4. **Graph API integration** -- bd-tracker and outlook-manager both integrate Microsoft Graph
5. **Docker/Traefik deployment** -- arilearn-phx, bd-tracker, outlook-manager share this pattern
6. **Terraform IaC** -- clerk-terraform + terraform-provider-clerk for auth infra
7. **MCP server development** -- arilearn-phx (MCP assessment), debtwire-mcp, areteos (MCP client)

### 2.4 Friction Points Observed

**Memory system inconsistency**:
- `bd-tracker` uses Claude's built-in project memory (`~/.claude/projects/*/memory/MEMORY.md`) rather than the session-log.md pattern from claude-setup
- `arilearn-phx` uses its own `agent-memory/` directory with per-agent MEMORY.md files
- `microsoft-outlook-python` also uses Claude's built-in project memory
- Only `claude-setup` and `bd-tracker` have proper `session-log.md` files
- The two systems (claude-setup session-log vs Claude's native MEMORY.md) coexist awkwardly

**Workflow adoption gap**:
- arilearn-phx has 19 plan docs and uses the brainstorm/plan/execute pipeline heavily
- bd-tracker has no plan docs -- work happens conversationally with direct implementation
- Most other projects have zero plan docs, zero spike docs
- The /end-session command exists but session-log.md is sparse (only 1 entry in claude-setup, 2 in bd-tracker)

**Skill coverage gaps for active work**:
- No FastAPI/Python-web skill despite bd-tracker and outlook-python being active
- No Microsoft Graph API skill despite 2 active projects using it
- No Docker/Traefik deployment skill despite 3 projects using it
- No Clerk/auth skill despite 3 projects dealing with it
- Existing `python` skill is generic -- doesn't cover FastAPI, pydantic structured output, or the Claude API Python SDK

**Agent model for non-Elixir projects**:
- arilearn-phx has evolved a sophisticated 4-agent team (lead + implementor + reviewer + compounder) with beads issue tracking
- No other project has project-specific agents
- The global agents are design-phase focused (brainstorm/plan/execute) -- no equivalent of the implementor/compounder pattern for other stacks

**Compounding pattern not generalized**:
- arilearn-phx's compounder agent + 122 solution docs is a powerful pattern
- Nothing equivalent exists for Python, TS, or Terraform projects
- The knowledge stays siloed in arilearn-phx

---

## 3. Skill Updates Needed

### 3.1 `python.md` -- Needs Major Update
- Currently covers Python 3.11+ basics, ruff, async patterns
- Missing: FastAPI patterns, pydantic v2 structured output, Claude API Python SDK, aiosqlite, httpx patterns
- bd-tracker and outlook-python both use these heavily
- **Priority: High** -- two active projects depend on this stack

### 3.2 `anthropic-api.md` -- Needs Python SDK Addition
- Currently TypeScript-only
- bd-tracker uses the Python SDK with tool_use for structured classification
- Should add Python patterns alongside TS
- **Priority: High**

### 3.3 `mcp.md` -- Needs Elixir MCP Patterns
- Currently covers TS + Python MCP patterns
- arilearn-phx has a full MCP server (Ash-backed, OAuth 2.1) that's a rich source of patterns
- Should add Elixir/Phoenix MCP patterns
- **Priority: Medium** -- arilearn-phx already has project-specific skills covering this

### 3.4 `terraform.md` -- Needs Clerk Provider Patterns
- Generic Terraform patterns currently
- We now have a custom Clerk provider + multi-environment module structure
- Should document the provider resource patterns and workspace strategy
- **Priority: Low** -- terraform work is infrequent

### 3.5 `testing.md` -- Needs FastAPI Test Patterns
- Missing pytest-asyncio, TestClient, mock patterns for FastAPI
- bd-tracker has 108 tests as reference
- **Priority: Medium**

---

## 4. New Skills Proposed

### 4.1 `fastapi.md` -- FastAPI Web Patterns
- Router structure, dependency injection, middleware, Pydantic v2 schemas
- Auth patterns (JWT validation, Microsoft Entra SSO token exchange)
- SQLite async patterns (aiosqlite, migrations, WAL mode)
- Webhook handlers (Graph API change notifications)
- **Source**: bd-tracker, microsoft-outlook-python
- **Priority: High**

### 4.2 `microsoft-graph.md` -- Microsoft Graph API Patterns
- Auth: MSAL client credentials, device code flow
- Endpoints: mail (read/move/categorize), webhooks, calendar
- Permissions model (application vs delegated, Application Access Policy)
- httpx async client patterns
- **Source**: bd-tracker, microsoft-outlook-manager/python
- **Priority: High** -- two active projects, recurring integration friction

### 4.3 `docker-deploy.md` -- Docker Compose + Traefik Deployment
- Docker Compose patterns for Python/Elixir apps
- Traefik reverse proxy with SSL
- Blue/green deployment (arilearn-phx has a full runbook)
- Health checks, env var injection, network configuration
- **Source**: arilearn-phx, bd-tracker, outlook-manager
- **Priority: Medium** -- deployment patterns repeat across projects

### 4.4 `clerk-auth.md` -- Clerk Authentication Patterns
- JWT validation (backend middleware)
- Org-level permissions
- Terraform resource patterns for Clerk
- Multi-environment strategy
- **Source**: clerk-poc-spike, clerk-terraform, terraform-provider-clerk
- **Priority: Medium**

### 4.5 `pydantic-ai.md` -- Pydantic Structured Output with Claude
- Tool_use for structured classification
- Pydantic model as schema for Claude output
- Error handling, retry, confidence scoring
- **Source**: bd-tracker classifier
- **Priority: Medium**

---

## 5. New Agents/Workflows Proposed

### 5.1 Generalized Compounder Agent (Global)
- arilearn-phx's compounder is the most effective knowledge capture pattern we have
- Should be generalized to work across any project/stack
- Writes to `docs/solutions/[category]/[kebab-name].md` with frontmatter
- Triggered after code review finds recurring patterns
- **Priority: High** -- prevents re-learning the same lessons

### 5.2 Deploy Agent
- Standard deployment workflow: build, push, verify health, rollback on failure
- Reads project-specific deploy config from CLAUDE.md
- Handles Docker Compose, Traefik, health checks
- Logs deployment to session memory
- **Priority: Medium** -- deployment is a common multi-step task

### 5.3 Backfill/Migration Agent
- Data migration, backfill, and schema change workflows
- Pre-flight checks, dry-run mode, rollback plan
- Relevant to arilearn-phx (Ash migrations), bd-tracker (SQLite migrations)
- **Priority: Low** -- infrequent but high-risk when it happens

### 5.4 Workflow: Quick Fix Pipeline
- For bug fixes and small changes that don't need brainstorm/plan
- `/fix [description]` -- reads context, makes change, runs tests, runs review, commits
- Currently people skip the entire pipeline for small fixes
- Should formalize the "tiny task" escape hatch mentioned in CLAUDE.md rules
- **Priority: High** -- most daily work is small fixes, not greenfield features

### 5.5 Workflow: Cross-Project Pattern Sync
- When a pattern is discovered in one project (e.g., Graph API webhook handling), surface it for promotion to global skills
- `update-claude-setup --promote` exists but is manual and only checks file existence
- Should also diff content and flag when project-specific knowledge could be global
- **Priority: Medium**

---

## 6. New Commands Proposed

### 6.1 `/fix` -- Quick Fix Without Full Pipeline
- Skip brainstorm/plan for small changes
- Flow: describe bug -> read context -> implement fix -> run tests -> run review -> suggest commit
- Explicitly for tasks under 30 min (the "skip plan" threshold in CLAUDE.md)
- **Priority: High**

### 6.2 `/deploy` -- Standardized Deployment
- Reads deploy config from CLAUDE.md
- Runs build, push, health check
- Logs result to session
- **Priority: Medium**

### 6.3 `/compound` -- Capture a Pattern from This Session
- Generalization of arilearn-phx compounder
- Invoked mid-session when you learn something worth documenting
- Writes to `docs/solutions/[category]/[name].md`
- **Priority: High**

### 6.4 `/status` -- Show Current State of All Plans
- Reads all docs/plans/*.md, shows status table
- Which plans are Draft, Ready, In Progress, Blocked, Done
- Quick situational awareness for epics
- **Priority: Low**

### 6.5 `/sync-memory` -- Reconcile Session Log with Project State
- Reads git log, dirty-files, and session-log.md
- Fills in gaps where /end-session was skipped
- Useful at start of session when memory is stale
- **Priority: Medium** -- /end-session is inconsistently used

---

## 7. Process Gaps

### 7.1 Memory System Fragmentation (Critical)
Three competing memory systems are in use:
1. **claude-setup session-log.md** -- `.claude/memory/session-log.md` (what we designed)
2. **Claude native MEMORY.md** -- `~/.claude/projects/*/memory/MEMORY.md` (what Claude auto-creates)
3. **Agent-specific memory** -- `.claude/agent-memory/*/MEMORY.md` (arilearn-phx pattern)

None of these talk to each other. Claude's native memory system has evolved since we built ours, and projects are gravitating toward it. Need a decision: lean into Claude's native memory, keep ours, or bridge them.

### 7.2 /end-session Is Not Reliably Run (High)
- Only 3 entries across all session-log.md files despite dozens of sessions
- The Stop hook appends a stub, but the memory-updater agent doesn't always run
- Session context is lost between sessions unless Claude's native memory captures it
- Root cause: closing the terminal doesn't trigger /end-session; users forget

### 7.3 Workflow Pipeline Adoption Is Low Outside arilearn-phx (High)
- bd-tracker: 27 commits, 0 plan docs, 0 spike docs
- outlook-manager: 19 commits, 0 plan docs
- terraform: 43 commits, 0 plan docs
- The pipeline works great for arilearn-phx (19 plans, 122 solution docs) but isn't used elsewhere
- Likely cause: the pipeline feels heavy for smaller/faster projects
- Need a "light mode" (the `/fix` command proposed above)

### 7.4 README and ONBOARDING Still Reference Old Scripts (Medium)
- README tells users to run `bash install.sh` and `bash init-project.sh`
- bin/ commands (`install-claude-setup`, `init-claude-setup`, `update-claude-setup`) now supersede these
- Session log from 2026-03-06 explicitly notes: "Old install.sh and init-project.sh still exist -- consider removing or redirecting"
- README needs updating

### 7.5 No Spike Docs Exist Anywhere (Medium)
- The research workflow and researcher agent produce `docs/spikes/*.md`
- Zero spike docs exist across all 24 repos (until this one)
- Either the researcher is never used, or spikes are done ad-hoc and not saved
- The pipeline assumes spikes feed into brainstorms, but this link isn't happening

### 7.6 Global Skills Don't Reflect Actual Stack Usage (Medium)
- Skills were written for the theoretical stack (Next.js, React, Prisma)
- Actual work is in Elixir/Phoenix/Ash (arilearn-phx), Python/FastAPI (bd-tracker, outlook), Go (terraform-provider), Terraform/HCL
- Next.js and Prisma skills exist but have zero active projects using them
- Missing skills for the tools actually in daily use (see Section 4)

### 7.7 Project Template Doesn't Include Workflows Dir (Low)
- `init-claude-setup` scaffolds `.claude/` + `docs/` from project-template
- Template includes `docs/workflows/` but only the project template has them
- When running init on a new project, the workflow docs are included, which is good
- However, the template CLAUDE.md is generic -- could include a checklist for first-session customization

### 7.8 No Mechanism to Share Learnings Across Projects (Medium)
- arilearn-phx has 122 solution docs (21K lines of institutional knowledge)
- None of this feeds back to other projects or global skills
- The compounder agent is project-scoped
- `update-claude-setup --promote` checks for file existence but not knowledge extraction

---

## 8. Recommendations (Prioritized)

### Tier 1 -- Do Next (High Impact, Clear Path)

1. **Add `/fix` command** -- Quick-fix pipeline for sub-30-min tasks. This addresses the #1 reason people skip the workflow: it feels too heavy for small changes. Simple flow: describe -> implement -> test -> review -> commit.

2. **Add `/compound` command + generalized compounder agent** -- Port arilearn-phx's compounder to global. This is the single highest-leverage pattern we've built. Every project should capture solution docs from review cycles.

3. **Update `python.md` skill** -- Add FastAPI, pydantic v2, aiosqlite, httpx patterns. Two active projects blocked by this gap.

4. **Add `anthropic-api.md` Python SDK section** -- bd-tracker's classifier is a great reference. Currently TS-only.

5. **Update README and ONBOARDING** -- Replace references to old scripts with bin/ commands. This was flagged in the last session log and still undone.

### Tier 2 -- Do Soon (High Impact, More Work)

6. **Add `microsoft-graph.md` skill** -- Two active projects, recurring friction. Extract patterns from bd-tracker and outlook-manager.

7. **Add `fastapi.md` skill** -- Codify bd-tracker's patterns (router, auth, webhooks, async DB, structured AI output).

8. **Resolve memory system fragmentation** -- Decide: lean into Claude's native `MEMORY.md`, deprecate session-log.md, or build a bridge. Current state causes confusion. Recommendation: lean into Claude's native memory and simplify our hooks to just track dirty-files. Let `/end-session` update CLAUDE.md "Current Focus" section (keep that) but stop fighting the native memory system.

9. **Add `docker-deploy.md` skill** -- Three projects share this pattern. Extract from arilearn-phx's blue-green runbook + bd-tracker's Docker Compose setup.

### Tier 3 -- Do Eventually (Lower Urgency)

10. **Add `/status` command** -- Plan status dashboard. Nice for epics.

11. **Add `/sync-memory` command** -- Backfill session context when /end-session was skipped. Addresses the inconsistent memory gap.

12. **Add `/deploy` command** -- Standardized deployment workflow. Medium value since deploy steps vary by project.

13. **Clean up old scripts** -- Remove or redirect `install.sh` and `init-project.sh` to bin/ equivalents.

14. **Cross-project pattern extraction** -- Enhance `update-claude-setup --promote` to diff content, not just file existence. Extract knowledge from project-specific solution docs into global skills.

15. **Update `terraform.md` skill** with Clerk provider patterns.

---

## Key Links / References

### Files in this repo
- `/Users/dom/dev/arete/claude-setup/global/` -- all global agents, commands, skills, hooks
- `/Users/dom/dev/arete/claude-setup/project-template/` -- project scaffolding template
- `/Users/dom/dev/arete/claude-setup/bin/` -- CLI tools (install, init, update)
- `/Users/dom/dev/arete/claude-setup/.claude/memory/session-log.md` -- only session log in this repo

### Key project artifacts
- `/Users/dom/dev/arete/arilearn-phx/.claude/agents/` -- 3 project-specific agents (implementor, reviewer, compounder)
- `/Users/dom/dev/arete/arilearn-phx/.claude/agent-memory/` -- per-agent memory files
- `/Users/dom/dev/arete/arilearn-phx/docs/solutions/` -- 122 solution docs across 13 categories
- `/Users/dom/dev/arete/arilearn-phx/docs/plans/` -- 19 plan docs
- `/Users/dom/dev/arete/bd-tracker/.claude/CLAUDE.md` -- well-maintained project context
- `/Users/dom/dev/arete/bd-tracker/.claude/memory/session-log.md` -- active session log

### Claude native memory
- `/Users/dom/.claude/projects/-Users-dom-dev-arete-bd-tracker/memory/MEMORY.md`
- `/Users/dom/.claude/projects/-Users-dom-dev-arete-bd-tracker/memory/feature-ideas.md`
- `/Users/dom/.claude/projects/-Users-dom-dev-arete-microsoft-outlook-python/memory/MEMORY.md`
- `/Users/dom/.claude/projects/-Users-dom-dev-arete-terraform-provider-clerk/memory/MEMORY.md`

## Open Questions

- [ ] Should we deprecate session-log.md in favor of Claude's native MEMORY.md, or keep both?
- [ ] Should the compounder agent write to a global solutions library or stay project-scoped?
- [ ] Is the 4-agent team model (lead + implementor + reviewer + compounder) worth generalizing beyond Elixir projects?
- [ ] Should `/fix` just be a lighter `/execute` or a completely separate pipeline?
- [ ] What's the right threshold for "this pattern should be a global skill" vs "project-specific knowledge"?
