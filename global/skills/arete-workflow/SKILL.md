---
name: arete-workflow
description: >-
  How the Areté Claude workflow system fits together — which slash command or agent to
  reach for, the three pipelines (quick fix / feature / epic), and where artifacts land
  under docs/features/.
when_to_use: >-
  When choosing between /fix, /plan, /execute, /work-issue and friends, when unsure which
  agent owns a step, or when asked what a command does or where its output goes. Triggers:
  which command, what does /x do, how does the workflow work, workflow, pipeline, epic,
  feature folder, docs/features, delegation, plan status, Draft, Ready.
---

# Areté Workflow System

One copy of this lives in the global config. It used to be copied into every repo as
`docs/reference/` + `docs/workflows/`, which is exactly why it sat four months stale in
three repos at once. Nothing here is project-specific.

For the live command list, run `claude-setup help` — it is generated from the installed
skills, so it cannot go stale. This skill is the annotated version.

## The three pipelines

| Situation | Pipeline |
|---|---|
| Bug fix, config change, anything < 30 min | `/fix [description]` |
| Feature, approach unclear | `/research` (optional) → `/brainstorm` → `/plan` → `/execute` → `/end-session` |
| Feature, approach already decided | `/plan` → `/execute` → `/end-session` |
| Multi-feature epic | `/brainstorm` → `/plan [epic]` → `/orchestrate` → `/plan` each → `/execute` each |
| Existing GitHub issue | `/work-issue <#>` |

Hard rule: the executor will not touch a plan whose status is `Draft`. Review it, flip to
`Ready`, then `/execute`.

## References

Load only what the question needs:

| File | Read when |
|---|---|
| `references/commands.md` | Asked what a specific command does, or which one to use |
| `references/decision-tree.md` | Choosing a pipeline, or mid-session command reference |
| `references/agents.md` | Which agent owns a step, what model it runs, how it's invoked |
| `references/file-structure.md` | Where artifacts live and why — `docs/features/`, `docs/solutions/`, `.claude/memory/` |
| `references/feature-workflow.md` | Full walkthrough of the single-feature pipeline with examples |
| `references/epic-workflow.md` | Full walkthrough of the epic pipeline |
| `references/research-workflow.md` | Full walkthrough of the research pipeline |

## Where things land

```
docs/features/[feature-name]/
├── RESEARCH.md        ← /research (optional)
├── BRAINSTORM.md      ← /brainstorm (optional)
├── PLAN.md            ← /plan
└── EXECUTION_LOG.md   ← /execute (audit trail)

docs/solutions/        ← the compounder agent (institutional memory)
.claude/memory/        ← session-log.md, dirty-files (gitignored)
```

## What is per-repo vs global

Global, via `~/.claude` — applies everywhere with no per-repo files:
skills, agents, rules, hooks, `CLAUDE.md`, `settings.json`.

Per-repo, because it genuinely cannot be global:

- `.claude/CLAUDE.md` — this project's stack, paths and `## Project Config` block
- `.claude/rules/org.md` — org conventions for this repo
- `.github/workflows/*.yml` — GitHub Actions must live in the repo
- `.claude/prompts/ci-triage.md` — read by the CI workflow from inside the repo

If you find yourself editing the same doc in more than one repo, it belongs in the global
config instead.
