---
doc: architecture
verified: never
# watches: globs whose change invalidates this doc. The doc-staleness hook reads these.
# Keep them NARROW — the spine and the high-churn paths only. Too broad and every
# session flags this doc, which trains you to ignore it. Widen when a real drift is missed.
# Elixir/Phoenix: lib/**, priv/repo/migrations/**, config/**
# Python/FastAPI:  app/**, src/**, alembic/**, pyproject.toml
# Next.js/React:   app/**, src/**, prisma/**, next.config.*
# Terraform:       */*.tf, modules/**
watches: []
---

# Architecture — [Project Name]

> Reference with @docs/architecture.md when relevant.
> Not loaded every session — only when needed.
> Deploy, secrets and rollback live in @docs/runbook.md, not here.

## Overview
[High-level description of how the system works]

## Key Design Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| [e.g. Server Actions over API routes] | [why] | [date] |

## Data Flow
[Describe how data moves through the system]

## External Dependencies
| Service | Purpose | Docs |
|---------|---------|------|
| Anthropic API | LLM completions | https://docs.anthropic.com |

## Known Limitations / TODOs
- [ ] [known gap or future work]

---

<!-- Anything you can't confirm from the code, write as **unknown**. Do not guess.
     A confidently wrong architecture doc is more expensive than a missing one —
     it gets trusted. See docs/features/repo-docs/EXECUTION_LOG.md in claude-setup
     for two real examples of this doc going stale and misleading. -->
