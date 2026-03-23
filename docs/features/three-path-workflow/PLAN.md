# Plan: Three-Path Dev Workflow

**Status**: Done
**Created**: 2026-03-23
**Last updated**: 2026-03-23

## Summary

Add domain-aware routing to the Claude Code setup so frontend, backend, and infra tasks automatically load the right standards, delegate to specialist agents, and apply path-scoped rules. This eliminates the "one-size-fits-all" treatment of dev tasks. Success = `/work-issue` detects the domain, loads relevant standards, and delegates to the right specialist agent for medium/large tasks.

## Approach

Layered approach from `docs/research/three-path-workflow.md`: domain skills (knowledge) + specialist agents (executors) + enhanced `/work-issue` (orchestrator) + path-scoped rules (auto-loaders). Skills carry the domain knowledge, agents preload the right skill stacks, `/work-issue` routes by detected domain, and path-scoped rules catch ad-hoc edits outside the command workflow.

## Affected Files / Components

| File / Component | Change | Why |
|-----------------|--------|-----|
| `global/skills/frontend-standards.md` | **Create** | Umbrella skill: React/Next.js/Tailwind/shadcn standards, design system, a11y |
| `global/skills/backend-standards.md` | **Create** | Umbrella skill: Arete stack conventions, API design, secrets, language standards |
| `global/skills/infra-standards.md` | **Create** | Umbrella skill: TF Cloud, AWS standards, CI/CD, monitoring |
| `global/agents/frontend-specialist.md` | **Create** | Agent preloading frontend skill stack |
| `global/agents/backend-specialist.md` | **Create** | Agent preloading backend skill stack |
| `global/agents/infra-specialist.md` | **Create** | Agent preloading infra skill stack |
| `global/commands/work-issue.md` | **Modify** | Add domain classification step (4.5), specialist delegation in step 7 |
| `project-template/.claude/CLAUDE.md` | **Modify** | Add `dev_domain` to Project Config block |
| `project-template/.claude/rules/frontend.md` | **Create** | Path-scoped rules for frontend files |
| `project-template/.claude/rules/backend.md` | **Create** | Path-scoped rules for backend files |
| `project-template/.claude/rules/infra.md` | **Create** | Path-scoped rules for infra files |
| `project-template/.claude/rules/EXAMPLE.md` | **Delete** | Replaced by real domain rule files |

## Implementation Steps

### Phase 1 -- Domain Skills

- [x] Step 1 -- Create `global/skills/frontend-standards.md`. YAML frontmatter: `name: frontend-standards`, `description: "Use when doing any frontend work -- React, Next.js, Tailwind, shadcn, UI components, design systems, accessibility, performance. Covers Arete frontend conventions and quality standards."` Body sections: Design System Persistence (check for system.md, component inventory), Build Rules (Next.js App Router, strict TS, named exports), Component Standards (functional + hooks, early returns, prop interfaces), Tailwind/shadcn conventions (utility-first, cn() helper, shadcn primitives before custom), State Management (server components default, client only when needed, Zustand for client state), Anti-Patterns list, Accessibility Checklist, Self-Review Checklist. Keep under 5KB.

- [x] Step 2 -- Create `global/skills/backend-standards.md`. YAML frontmatter: `name: backend-standards`, `description: "Use when doing any backend work -- APIs, services, databases, auth, background jobs. Covers Arete backend conventions for Python, TypeScript, and Elixir."` Body sections: Arete Stack Conventions (FastAPI for Python APIs, Phoenix/Ash for Elixir, Node.js for lightweight services), Secrets Policy (Infisical only -- never env files, never hardcoded), API Design (REST: { data, error, meta } shape, Pydantic/Zod validation at boundary, 404 with message never empty 200), Language Standards (Python: ruff, pydantic v2, async where possible; TS: strict mode, named exports; Elixir: Ash resources, pipe operator), Database (migrations always reversible, no raw SQL in app code, use ORM/query builder), Error Handling (explicit, no silent failures, structured error responses), Self-Review Checklist. Keep under 5KB.

- [x] Step 3 -- Create `global/skills/infra-standards.md`. YAML frontmatter: `name: infra-standards`, `description: "Use when doing any infrastructure work -- Terraform, AWS, CI/CD, Docker, deployment, IAM, ECS, Lambda, GitHub Actions. Covers Arete IaC and cloud conventions."` Body sections: TF Cloud Workspaces (one workspace per env per project, remote execution, VCS-driven for prod), Terraform Standards (reference terraform skill for basics, add: module registry preference, workspace-aware state, `terraform plan` required before apply), AWS Standards (IAM: least privilege, no inline policies, role-based; ECS: Fargate preferred, Tailscale sidecar for private networking; Lambda: Python/Node runtimes, 15min timeout max, structured logging), CI/CD (GitHub Actions, reusable workflows, environment protection rules, deploy approval for prod), Monitoring (CloudWatch alarms on all services, structured logs, alert thresholds), Self-Review Checklist. Keep under 5KB.

### Phase 2 -- Specialist Agents

- [x] Step 4 -- Create `global/agents/frontend-specialist.md`. Frontmatter: name, description (see research doc), tools: Read/Write/Edit/Bash/Glob/Grep, model: opus, skills: frontend-standards/ts-component/api-route/nodejs. Body: (1) On-Activation Checklist -- read project CLAUDE.md, check for design system file (system.md or similar), scan existing components for patterns, identify test framework. (2) Domain Workflow -- check existing component patterns before creating new ones, use shadcn primitives, server components by default. (3) Quality Gate -- accessibility (labels, keyboard nav, focus management), no `any` types, no inline styles, responsive, loading/error states. (4) Handoff Format -- summary of files changed, components created/modified, a11y status, test status.

- [x] Step 5 -- Create `global/agents/backend-specialist.md`. Frontmatter: name, description, tools: Read/Write/Edit/Bash/Glob/Grep, model: opus, skills: backend-standards/python/elixir/phoenix/database/error-handling. Body: (1) On-Activation Checklist -- read project CLAUDE.md, identify language/framework, check secrets approach, find test config. (2) Domain Workflow -- check existing patterns (error handling, response shapes, auth), follow language-specific conventions, validate at boundaries. (3) Quality Gate -- no hardcoded secrets, error handling explicit, tests pass, API shape consistent, migrations reversible. (4) Handoff Format -- summary of changes, endpoints added/modified, migration status, test results.

- [x] Step 6 -- Create `global/agents/infra-specialist.md`. Frontmatter: name, description, tools: Read/Write/Edit/Bash/Glob/Grep, model: opus, skills: infra-standards/terraform/docker-deploy/infisical/env-config. Body: (1) On-Activation Checklist -- read project CLAUDE.md, identify cloud provider and IaC tool, check TF Cloud workspace config, find CI/CD setup. (2) Domain Workflow -- always `terraform plan` first, check state backend config, validate IAM policies against least-privilege, verify tagging. (3) Quality Gate -- no hardcoded credentials, all resources tagged, prevent_destroy on stateful prod resources, plan shows expected changes only, CI passes. (4) Handoff Format -- summary of resources added/modified/destroyed, plan output summary, security review notes.

### Phase 3 -- Command Routing

- [x] Step 7 -- Update `global/commands/work-issue.md`. Insert new "Step 4.5: Domain Classification" between current steps 4 and 5. Content: (a) Classify domain from affected files identified in step 4 using patterns: .tsx/.jsx/.css/components/pages/app = Frontend, .py/.ex/.ts(non-component)/api/services/lib = Backend, .tf/.hcl/infra/terraform/.github/workflows = Infra. (b) If `dev_domain` exists in Project Config, use as default. (c) If multiple domains detected, ask user which is primary. (d) Output block: Domain, Specialist agent, Context summary. Then update step 7 (Do the Work): for `/fix` scope, load domain skill inline and implement in main session; for `/plan` or `/brainstorm` scope, delegate implementation to the appropriate specialist agent after plan approval; for multi-domain, ask user for primary domain, delegate to that specialist.

- [x] Step 8 -- Update `project-template/.claude/CLAUDE.md`. Add `dev_domain` field to the Project Config YAML block with comment: `# dev_domain: backend  # frontend | backend | infra | fullstack (optional -- /work-issue auto-detects if missing)`. Place it after `base_branch`.

### Phase 4 -- Path-Scoped Rules

- [x] Step 9 -- Create `project-template/.claude/rules/frontend.md`. Frontmatter paths: `src/components/**`, `src/app/**`, `*.tsx`, `*.jsx`. Body: lightweight pointers -- check frontend-standards skill, server components by default, use shadcn primitives, check for design system file, run lint after changes.

- [x] Step 10 -- Create `project-template/.claude/rules/backend.md`. Frontmatter paths: `src/api/**`, `src/lib/**`, `src/services/**`, `*.py`, `*.ex`. Body: lightweight pointers -- check backend-standards skill, all secrets via Infisical, API responses use { data, error, meta } shape, run tests after changes.

- [x] Step 11 -- Create `project-template/.claude/rules/infra.md`. Frontmatter paths: `terraform/**`, `infra/**`, `.github/workflows/**`, `*.tf`. Body: lightweight pointers -- check infra-standards skill, always `terraform plan` before apply, all resources tagged, no hardcoded credentials, check CI workflow syntax.

- [x] Step 12 -- Delete `project-template/.claude/rules/EXAMPLE.md`. Its content (API conventions) is now covered by the backend rule file.

### Phase 5 -- Deploy and Verify

- [x] Step 13 -- Run `./install-claude-setup --force` to deploy all new files to `~/.claude/`.
- [x] Step 14 -- Verify deployment: confirm all 3 skills, 3 agents, updated work-issue command, and project template rules exist in `~/.claude/`.
- [x] Step 15 -- Smoke test: open a project repo, confirm domain skills load by description match when discussing frontend/backend/infra topics.

## Out of Scope

- Agent teams / multi-agent coordination (experimental, wait for GA)
- A `dev-router` meta-skill (skills cannot load other skills)
- Changes to global `CLAUDE.md` for routing (skills and agents carry domain knowledge)
- New domain skills beyond the three paths (e.g., data/ML -- add later if needed)
- Automated testing framework for skills/agents (no mechanism exists yet)

## Risks / Tradeoffs

- **Skill size vs. depth**: 5KB limit means domain standards must be concise. Mitigation: use progressive disclosure -- umbrella skill for standards, existing specific skills (python, terraform, etc.) for implementation detail.
- **Description-match routing is fuzzy**: Claude might not always load the right domain skill. Mitigation: path-scoped rules provide a backup auto-load mechanism; `/work-issue` explicitly classifies.
- **Agent cold start cost**: Specialist agents spin up a new context window. Mitigation: only delegate medium/large tasks; `/fix` stays inline.
- **Skill list in agent frontmatter may drift**: If skills are renamed or added, agent definitions need updating. Mitigation: keep agent skill lists in sync during any skill changes (add to maintenance checklist).
- **Project template rules assume common directory structures**: Projects with non-standard layouts won't match. Accepted tradeoff -- users customize paths per project.

## Resolved Questions

- [x] **Agent model**: Opus for all coding agents (specialists do implementation). Sonnet for planning-only agents unless complexity warrants Opus. Updated steps 4-6 to use `model: opus`.
- [x] **Delegation style**: Always ask before delegating to specialist. `/work-issue` presents domain classification + recommended specialist, user confirms. Safer and lets user override if detection is wrong.

## Skills / Agents to Use

- **executor**: Run `/execute three-path-workflow` to execute this plan step by step
- **code-reviewer**: After all files are created, review the full changeset for consistency
- **memory-updater**: After completion, log the new capabilities to session memory
