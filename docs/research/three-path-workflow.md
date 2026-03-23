# Research: Three-Path Dev Workflow — Frontend / Backend / Infra

> Status: **Research complete** — ready for brainstorm/plan
> Author: Dominick | Arete Capital Partners
> Date: 2026-03-22

---

## Problem

Claude treats every task the same regardless of domain. A Terraform change gets the same context as a React component. `/work-issue` recommends `/fix` vs `/plan` based on scope, but never asks "is this frontend, backend, or infra?" and never loads domain-specific standards.

**Goal:** When working any dev task, Claude should know the domain, load the right standards, and apply domain-specific quality checks — automatically where possible, explicitly where needed.

---

## Research Findings

### What mechanisms exist in Claude Code today?

| Mechanism | Auto-loads? | Scope | Best for |
|---|---|---|---|
| **Skills** (`.claude/skills/` or `~/.claude/skills/`) | By description match — Claude reads all descriptions and decides | Global or project | Domain reference docs, coding patterns, standards |
| **Path-scoped rules** (`.claude/rules/*.md` with `paths:` frontmatter) | Yes — loads when editing files matching glob patterns | Project only | "When editing `src/api/**`, these rules apply" |
| **Agents** (`agents/*.md` with `skills:` field) | No — must be explicitly invoked | Global or project | Specialist with preloaded domain skills, isolated context |
| **Commands** (`commands/*.md`) | No — user invokes | Global or project | Workflow orchestration (like `/work-issue`) |
| **CLAUDE.md** | Always loaded | Global + project | Identity, stack, workflow rules |

### What does NOT work?

- **Skills cannot load other skills** — no composition or chaining
- **Skills cannot be sub-files of another skill** — the `dev-router/references/frontend.md` pattern from the original plan won't work
- **No automatic domain detection** — Claude doesn't classify "this is a frontend task" unless you tell it to or the skill description matches
- **Agent teams are experimental** — `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` required, known issues with task coordination and shutdown
- **Path-scoped rules are project-only** — can't put global path rules in `~/.claude/rules/`

### What DOES work?

1. **Standalone domain skills with good descriptions** — Claude loads them when the task matches. Already proven with `python.md`, `terraform.md`, `ts-component.md`.
2. **Path-scoped rules per project** — auto-load domain context when editing specific directories. Already have an `EXAMPLE.md` in the template.
3. **Agents with `skills:` preload** — a `backend-specialist` agent can declare `skills: [python, error-handling, database]` and get all three loaded at startup.
4. **Command-level routing** — `/work-issue` can add a domain classification step based on files identified during analysis.
5. **Project Config fields** — `dev_domain: backend` in Project Config to declare the primary domain upfront.

### What we already have (audit)

**Skills by domain:**

| Domain | Existing skills | Coverage |
|---|---|---|
| Frontend | `ts-component`, `api-route`, `nodejs` | 30% — component templates only, no state mgmt, design system, a11y, performance |
| Backend | `python`, `elixir`, `phoenix`, `database`, `error-handling`, `anthropic-api`, `microsoft-graph` | 60% — good language coverage, missing auth patterns, job queues, API design depth |
| Infra | `terraform`, `docker-deploy`, `infisical`, `env-config` | 50% — good IaC basics, missing AWS depth, CI/CD patterns, monitoring |
| Cross-cutting | `logging`, `testing`, `mcp` | Solid fundamentals |

**Key gap:** No "umbrella" skills that provide domain-wide standards. Individual skills cover specific tools (Python, Terraform) but nothing says "when doing backend work at Arete, here are ALL the standards that apply." The original plan's reference files (`frontend.md`, `backend.md`, `infra.md`) fill this gap — they just need to be standalone skills, not sub-files.

---

## Recommendation: Layered Approach

Four layers, all shipping together. Skills are the knowledge, agents are the executors, rules are the auto-loaders, and `/work-issue` is the orchestrator.

### Layer 1: Domain Reference Skills (global — the knowledge)

**What:** Three new standalone skills in `~/.claude/skills/` that serve as umbrella references for each domain.

**Why:** Claude already picks skills by description match. A skill named `frontend-standards` with description "Use when doing any frontend work — React, Next.js, Tailwind, shadcn, UI components, design systems, accessibility" will auto-load when the task involves UI work. No router needed — the description-matching mechanism IS the router.

**Files to create:**
- `~/.claude/skills/frontend-standards.md` — design system persistence, build rules, anti-patterns, audit chain, a11y checklist
- `~/.claude/skills/backend-standards.md` — Arete stack conventions, secrets policy, API design, language standards, self-review checklist
- `~/.claude/skills/infra-standards.md` — TF Cloud workspaces, Terraform standards, AWS standards (IAM, ECS, Lambda), CI/CD, self-review checklist

**Content source:** The reference files from the original plan are excellent content. Reformat as standalone skills with proper YAML frontmatter.

**Why not a router skill?** Skills can't load other skills. A "dev-router" skill would need to tell Claude "now go read `references/frontend.md`" — but that file doesn't exist as a skill Claude can discover. Good descriptions on domain skills = automatic routing for free.

### Layer 2: Specialist Agents (global — the executors)

**What:** Three specialist agents that preload domain skills and run with isolated context windows.

**Why agents, not just skills?**
- **Isolated context** — backend-specialist doesn't have frontend noise in its window
- **Preloaded domain stack** — `skills: [python, backend-standards, error-handling, database]` ALL loaded at startup, not just whichever one Claude picks
- **Consistent persona** — system prompt sets domain-specific behavior and quality checks
- **Tool restrictions** — frontend specialist gets Chrome for visual testing, infra doesn't need it

**Files to create:**

```yaml
# ~/.claude/agents/frontend-specialist.md
---
name: frontend-specialist
description: >
  Frontend specialist for React/Next.js/Tailwind/shadcn work at Arete.
  Use for UI, component, design system, accessibility, and performance tasks.
  Spawned by /work-issue or invoked directly for frontend implementation.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
skills:
  - frontend-standards
  - ts-component
  - api-route
  - nodejs
---
```

```yaml
# ~/.claude/agents/backend-specialist.md
---
name: backend-specialist
description: >
  Backend specialist for APIs, services, databases, and auth at Arete.
  Use for Python, TypeScript, Elixir service work, database changes,
  and API design. Spawned by /work-issue or invoked directly.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
skills:
  - backend-standards
  - python
  - elixir
  - phoenix
  - database
  - error-handling
---
```

```yaml
# ~/.claude/agents/infra-specialist.md
---
name: infra-specialist
description: >
  Infrastructure specialist for Terraform, AWS, CI/CD, and deployment at Arete.
  Use for all IaC, cloud resources, IAM, ECS, Lambda, GitHub Actions,
  and Tailscale work. Spawned by /work-issue or invoked directly.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
skills:
  - infra-standards
  - terraform
  - docker-deploy
  - infisical
  - env-config
---
```

**How `/work-issue` uses them:**

| Scope | What happens |
|---|---|
| **Small** (`/fix`) | Inline — load the domain skill in main session, do it fast |
| **Medium** (`/plan`) | Delegate to specialist agent — isolated context, full domain stack |
| **Large** (`/brainstorm` → `/plan`) | Specialist agent for implementation after plan is approved |

**Agent body content:** Each specialist gets a system prompt covering:
1. On-activation checklist (what to verify before writing code)
2. Domain-specific workflow (e.g. frontend: check for `system.md`, scan existing components)
3. Quality gate (self-review checklist from the domain reference)
4. Handoff format (what to report back to the main session)

### Layer 3: Enhanced `/work-issue` with Domain Classification (global — the orchestrator)

**What:** Add a domain detection step to `/work-issue` between "Deep Analysis" (step 4) and "Determine Approach" (step 6).

**How it works:**
1. During step 4 (Deep Analysis), `/work-issue` already identifies affected files
2. New step classifies domain based on file patterns + issue labels:
   - `.tsx`, `.jsx`, `.css`, `components/`, `pages/`, `app/` → Frontend
   - `.py`, `.ex`, `.ts` (non-component), `api/`, `services/`, `lib/` → Backend
   - `.tf`, `.hcl`, `infra/`, `terraform/`, `.github/workflows/` → Infra
   - Multiple domains → ask the user
3. State the active domain and relevant standards before proceeding
4. If project has `dev_domain` in Project Config, use it as default (still confirm)

**Output block:**
```
Domain:   Backend
Specialist: backend-specialist (python, backend-standards, error-handling, database)
Context:  3 files in src/api/, 1 migration, 1 test file
```

**Routing logic in step 7 (Do the Work):**
- `/fix` scope → load domain skill inline, implement in main session
- `/plan` or `/brainstorm` scope → delegate implementation to specialist agent
- Multi-domain → ask user which domain is primary, delegate to that specialist, then handle secondary domain after

### Layer 4: Path-Scoped Rules in Project Template (per project — the auto-loaders)

**What:** Add domain-specific rule files to the project template so new projects get auto-loading domain context.

**Files in `project-template/.claude/rules/`:**
- `frontend.md` — with `paths: ["src/components/**", "src/app/**", "*.tsx", "*.jsx"]`
- `backend.md` — with `paths: ["src/api/**", "src/lib/**", "src/services/**", "*.py", "*.ex"]`
- `infra.md` — with `paths: ["terraform/**", "infra/**", ".github/workflows/**", "*.tf"]`

**Why:** These auto-load when Claude edits files in matching paths. No invocation needed. Complements the global skills with project-specific conventions. Works even outside of `/work-issue` — any time you edit a `.tf` file, infra rules load.

**Content:** Lightweight project-specific pointers, not full standards. Example:
```markdown
---
paths: ["src/api/**", "src/lib/**", "*.py"]
---
# Backend Rules
- All secrets via Infisical — check env-config skill
- API responses: `{ data, error, meta }` shape
- Run `pytest -x -q` after changes
- Check backend-standards skill for full conventions
```

---

## How It All Fits Together

```
User: /work-issue 85

Step 1-4: Load issue, checkout, analyze files
  └─ "Found 3 Python files in src/api/, 1 migration, 1 test"

Step 4.5: Domain Classification
  └─ "Domain: Backend"
  └─ "Specialist: backend-specialist"

Step 5-6: Determine approach
  ├─ Small (1-2 files) → /fix inline with backend-standards skill loaded
  └─ Medium/Large → delegate to backend-specialist agent
                     └─ Agent has: python + backend-standards + error-handling + database
                     └─ Agent does: implement, test, self-review
                     └─ Returns: summary of changes + checklist status

Step 7-11: Review, commit, update PM
```

**Outside of `/work-issue`:** Specialist agents can be invoked directly:
- "Use the frontend-specialist to build this dashboard component"
- "Use the infra-specialist to set up the ECS task definition"
- Skills auto-load by description match for ad-hoc work
- Path-scoped rules auto-load when editing domain-specific files

---

## What NOT to Build

1. **`dev-router` skill** — skills can't load other skills. The description-matching mechanism IS the router.
2. **CLAUDE.md modifications for routing** — adds lines to an already-constrained file. Skills + agents handle this.
3. **Agent teams** — experimental, unreliable coordination, no resumption. Wait for GA.
4. **Automatic file-path skill loading** — doesn't exist at global level. Use path-scoped rules instead (project-level).

---

## Project Config Addition

Add `dev_domain` to the Project Config schema:

```yaml
dev_domain: backend                    # frontend | backend | infra | fullstack
```

- `/work-issue` uses this as the default domain classification
- `fullstack` loads all three reference skills
- Still confirms with user if analysis suggests a different domain
- Optional — if missing, `/work-issue` classifies from file analysis

---

## Execution Order

### Phase 1 — Domain Skills (the knowledge)

1. Create `global/skills/frontend-standards.md` — standalone skill with full frontend reference content
2. Create `global/skills/backend-standards.md` — standalone skill with full backend reference content
3. Create `global/skills/infra-standards.md` — standalone skill with full infra reference content

### Phase 2 — Specialist Agents (the executors)

4. Create `global/agents/frontend-specialist.md` — preloads: `frontend-standards`, `ts-component`, `api-route`, `nodejs`
5. Create `global/agents/backend-specialist.md` — preloads: `backend-standards`, `python`, `elixir`, `phoenix`, `database`, `error-handling`
6. Create `global/agents/infra-specialist.md` — preloads: `infra-standards`, `terraform`, `docker-deploy`, `infisical`, `env-config`

### Phase 3 — Command Routing (the orchestrator)

7. Update `global/commands/work-issue.md` — add domain classification step (4.5) and specialist delegation in step 7
8. Update `project-template/.claude/CLAUDE.md` — add `dev_domain` to Project Config

### Phase 4 — Path-Scoped Rules (the auto-loaders)

9. Add `project-template/.claude/rules/frontend.md` — lightweight path-scoped rules for frontend files
10. Add `project-template/.claude/rules/backend.md` — lightweight path-scoped rules for backend files
11. Add `project-template/.claude/rules/infra.md` — lightweight path-scoped rules for infra files
12. Remove or rename `project-template/.claude/rules/EXAMPLE.md` (replaced by real domain rules)

### Phase 5 — Deploy & Test

13. Run `install-claude-setup --force` to deploy to `~/.claude/`
14. Test with a real issue in a project repo

### Future — When agent teams hit GA

15. Evaluate agent teams for parallel multi-domain work
16. Consider `dev-orchestrator` lead agent that coordinates specialists

---

## Success Criteria

- [ ] `/work-issue 85` on a Python API issue → auto-detects "Backend", recommends `backend-specialist`
- [ ] `/work-issue` on a medium+ backend task → delegates to `backend-specialist` agent with full domain stack
- [ ] `/work-issue` on a small frontend fix → loads `frontend-standards` inline, does it fast
- [ ] Direct invocation: "use frontend-specialist to build this" → works with isolated context + preloaded skills
- [ ] Editing a `.tsx` file → path-scoped frontend rules auto-load (in projects with rules configured)
- [ ] Editing a `.tf` file → path-scoped infra rules auto-load
- [ ] Ambiguous task → Claude asks "Frontend, backend, or infra?"
- [ ] `dev_domain: backend` in Project Config → `/work-issue` defaults to backend path
- [ ] No bloat in global CLAUDE.md — skills and agents carry the domain knowledge

---

## Sources

- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Skill Authoring Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Skills Explained — How Skills Compare to Prompts, Projects, MCP, and Subagents](https://claude.com/blog/skills-explained)
- [Claude Code Multiple Agent Systems — Complete 2026 Guide](https://www.eesel.ai/blog/claude-code-multiple-agent-systems-complete-2026-guide)
- [Claude Agent Skills — First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
