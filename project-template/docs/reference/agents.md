# Agent Reference

Agents are specialized subprocesses that handle specific tasks. They're invoked automatically by commands or can be called directly.

## Design-Phase Agents

| Agent | Model | What it does | Invoked by |
|-------|-------|-------------|------------|
| **brainstorm** | opus | Explores solution space, converges to 2-3 options | `/brainstorm` |
| **planner** | opus | Turns ideas into structured plan docs | `/plan` |
| **orchestrator** | opus | Breaks epics into sub-feature folders + dependency order | `/orchestrate` |
| **researcher** | opus | Technical investigation — facts before decisions | `/research` |

## Execution-Phase Agents

| Agent | Model | What it does | Invoked by |
|-------|-------|-------------|------------|
| **dispatcher** | sonnet | Analyzes an issue, classifies the domain, recommends the specialist and skills. Read-only | `/work-issue`, between context-load and execution |
| **executor** | sonnet | Executes plan docs step by step with audit trail. Preloads `pre-impl-audit` | `/execute` |
| **code-reviewer** | sonnet | Reviews for quality, security, correctness | `/code-review`, or auto after `/execute` |
| **debugger** | sonnet | Root cause analysis for bugs | Direct invocation |

## Domain Specialists

Each preloads its domain's skills, so it starts with the conventions already in context.

| Agent | Model | Covers | Invoked by |
|-------|-------|--------|------------|
| **backend-specialist** | opus | APIs, services, databases, auth — Python/FastAPI, TS/Node, Elixir/Phoenix | `/work-issue` for backend work, or directly |
| **frontend-specialist** | opus | React/Next.js/Tailwind/shadcn, design system, a11y | `/work-issue` for frontend work, or directly |
| **infra-specialist** | opus | Terraform, AWS, CI/CD, Docker, IAM, ECS, Lambda | `/work-issue` for infra work, or directly |

iOS work has no specialist — load the `ios-standards` skill directly.

## Knowledge Agents

| Agent | Model | What it does | Invoked by |
|-------|-------|-------------|------------|
| **compounder** | sonnet | Captures patterns into reusable solution docs | "compound this pattern" |
| **memory-updater** | sonnet | Writes session summaries, updates Current Focus | `/end-session` |

## Meta Agents

| Agent | Model | What it does | Invoked by |
|-------|-------|-------------|------------|
| **meta-agent** | opus | Creates new agents from descriptions | Direct invocation |

## How Agents Work

- **Opus agents** handle thinking tasks (brainstorming, planning, research, architecture)
- **Sonnet agents** handle execution tasks (coding, reviewing, logging)
- Agents read from and write to `docs/features/[topic]/` — each feature gets its own folder
- The executor always shows a delegation preview before doing any work
- Agents can be overridden per-project by placing a file with the same name in `.claude/agents/`

## Adding Project-Specific Agents

Create `.claude/agents/[name].md` in your project. If the name matches a global agent, the project version takes precedence.

```markdown
---
name: agent-name
description: What this agent does and when to use it.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---

Instructions for the agent...
```
