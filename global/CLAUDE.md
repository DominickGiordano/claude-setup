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

## Response Defaults
- Short bullets for lists, prose for explanations
- Always propose a plan before writing code
- Call out assumptions and tradeoffs
- If something seems off, say so
- **All doc output as `.md` files** — never paste long docs into chat, write to file

## Standard Workflow

**Quick fix** (bug fix, small change, < 30 min): `/fix [description]`
**Single feature**: `/research` (optional) → `/brainstorm` → `/plan` → `/execute` → `/end-session`
**Epic (multi-feature)**: `/brainstorm` → `/plan [epic]` → `/orchestrate` → `/plan` each stub → `/execute` each → `/end-session`

Full walkthroughs: `@docs/workflows/feature-workflow.md`, `@docs/workflows/epic-workflow.md`, `@docs/workflows/research-workflow.md`

Rules:
- Use `/fix` for small, well-understood changes — it skips brainstorm/plan
- Run `/research` when evaluating unfamiliar tech before brainstorming
- Skip brainstorm only if approach is already decided
- Skip plan only for tiny tasks (single file, no risk, < 30 min)
- Never execute a plan with status `Draft` — flip to `Ready` first
- Use `/compound` to capture patterns worth preserving across sessions
- Always run `/end-session` before closing

## Reference Docs
- `@docs/reference/commands.md` — what each command does and when to use it
- `@docs/reference/agents.md` — what each agent does and how they're invoked
- `@docs/reference/workflows.md` — decision tree for picking the right pipeline
- `@docs/reference/file-structure.md` — where everything lives and why

## Memory
- Session learnings should be appended to `.claude/memory/session-log.md` in the active project
- Use the `#` shortcut to add quick memory items during sessions
- Run `/end-session` before closing to summarize and commit learnings

## Git Commit Rules
- Do NOT add "Co-Authored-By" lines to commit messages — ever, in any project
- Do NOT tag issue numbers (`#N`) in commits unless the commit is directly related to that issue
- Branch naming convention: `<type>/<issue-number>-<short-desc>` (e.g. `feature/42-coverage-calc`)
- Commit messages start with issue number: `#42 add coverage calculation`
- PRs must use `Closes #N` in description — branch name alone does NOT auto-link

## Notion Task Discipline
- Always check off completed subtasks before marking a task Done
- Note skipped subtasks with reason
- Append a completion note with date and brief summary
- Never flip Status → Done without updating content first

## Lessons
- Do NOT put project-specific rules in `~/.claude/CLAUDE.md`. Move them to the project's `.claude/CLAUDE.md` or `.claude/rules/`.
- Do NOT let project `CLAUDE.md` exceed 200 lines. Split path-specific content to `.claude/rules/` files with `paths:` frontmatter.
- Do NOT restate linter/formatter rules in CLAUDE.md. Reference the config file instead.
- Do NOT write long explanatory paragraphs in CLAUDE.md. Use short imperative bullets.
- Do NOT make changes to multiple files without presenting the full plan first.
- Do NOT update `CLAUDE.md` without reading it first and checking the line count after.
- Do NOT create speculative commands, skills, or agents. Build them when the need is confirmed.
- Do NOT skip `/end-session`. Session memory is how you stay effective across sessions.
- Do NOT put ephemeral state (current focus, branch lists, deploy checklists) in CLAUDE.md. Use memory files instead.
- Do NOT duplicate CLAUDE.md content in MEMORY.md. Memory is for non-obvious context; CLAUDE.md is for rules.
