# Global Context — Dominick @ Areté Capital Partners

## Identity
- **Name**: Dominick
- **Role**: Senior Software Engineer
- **Org**: Areté Capital Partners (ACP)
- **Mission**: Build AI solutions that make Spencer, Justino, and Sara's work easier and more effective

## Working Style
- Casual and direct — no fluff, no filler
- Plan before code — always
- Accuracy over speed
- Surface gaps in my thinking, don't just validate me
- Flag repetitive tasks so we can automate them

## What I'm Building
- AI-powered workflows and automations for internal teams
- Agentic tooling using Claude Code, MCP, and Anthropic APIs
- Artifacts, skills, agents, and tools for the Areté AI platform

## Stack
- **Languages**: TypeScript/JavaScript, Python, Elixir, Go, HCL
- **Frameworks**: Phoenix/Ash, FastAPI, Next.js, React, Node.js
- **AI**: Anthropic API, Claude Code, MCP servers
- **Infra**: Docker Compose, Traefik, Terraform (check project CLAUDE.md for specifics)

## Code Defaults
- TypeScript strict mode
- Functional components, hooks — no class components
- Named exports over default exports (unless framework requires)
- Early returns over nested conditionals
- Explicit error handling — no silent failures
- No commented-out code in commits

## Reuse Before Adding
- Before writing a new helper, component, util, hook, or context function, grep the codebase first — 30 seconds searching beats 5 minutes writing
- If similar exists: import or extend it. Two parallel implementations of the same thing is bloat
- If shape is close but wrong: refactor the existing one to fit both callers
- Applies to docs, configs, fixtures, scripts, types — not just runtime code
- Distinct from "three similar lines is better than premature abstraction" — that's about CREATING new abstractions; this is about USING existing ones

## Response Defaults
- Short bullets for lists, prose for explanations
- Always propose a plan before writing code
- Call out assumptions and tradeoffs
- If something seems off, say so
- **All doc output as `.md` files** — never paste long docs into chat, write to file

## Branch Flow — HARD RULE, EVERY REPO, NO EXCEPTIONS
**`feature → develop → main`. ALWAYS.**
- **NEVER open a PR with `--base main`.** Never push to `main`, never merge to `main`.
  `main` is release + production deploy on every push. A PR merged to `main` ships to prod.
- **ALWAYS `--base develop`.** Branch off `origin/develop`, PR into `develop`.
- **Before creating ANY PR**, confirm the target: `git ls-remote --heads origin develop`.
  If `develop` exists, it is the base. Full stop.
- **`git remote show origin` "HEAD branch" is NOT the PR target.** It reports the repo's
  default branch (usually `main`) and says nothing about the branch flow. Using it as the
  base is exactly how a fix got merged straight to `main` and auto-deployed to production.
- `main` only ever receives changes via a develop→main promotion, done by a human.
- If a repo genuinely has no `develop`, stop and ask before targeting `main`.
- The `guard-bash` PreToolUse hook enforces this. If it blocks you, it is right — fix the
  base, don't work around it.

## Standard Workflow

**Quick fix** (bug fix, small change, < 30 min): `/fix [description]`
**Single feature**: `/research` (optional) → `/brainstorm` → `/plan` → `/execute` → `/end-session`
**Long build, hand me PRs**: `/brainstorm` → `/plan` → `/goals` → `/goal` — or `/cycle` to run all four with gates
**Epic (multi-feature)**: `/brainstorm` → `/plan [epic]` → `/orchestrate` → `/plan` each stub → `/execute` each → `/end-session`
**On an existing issue**: `/work-issue <#>` (branches off `base_branch`)

Rules:
- Use `/fix` for small, well-understood changes — it skips brainstorm/plan
- Run `/research` when evaluating unfamiliar tech before brainstorming
- Skip brainstorm only if approach is already decided
- Skip plan only for tiny tasks (single file, no risk, < 30 min)
- Never execute a plan with status `Draft` — flip to `Ready` first
- Ask the `compounder` agent to capture patterns worth preserving across sessions
- Always run `/end-session` before closing

`/issue` and `/status` dispatch on their first arg — `/issue bug|new|from-plan|update`,
`/status [--features|--board <filter>]`. For full walkthroughs, which command to reach for,
or where artifacts land, use the `arete-workflow` skill — it loads on demand, so it costs
nothing until asked. `claude-setup help` prints the live command list.

## Memory
- Session learnings go in `.claude/memory/session-log.md` in the active project
- Use the `#` shortcut to add quick memory items during sessions
- Run `/end-session` before closing to summarize and commit learnings

## Rules loaded separately
`~/.claude/rules/` carries the detail so it isn't in context every session:
`root-cause.md` and `git-discipline.md` always load; `verification.md` loads on UI and
template files; `config-hygiene.md` loads when editing Claude config itself.
