# [Project Name]

<!-- First-session checklist — delete this block when done:
  [ ] Fill in "What This Is" with project purpose and users
  [ ] Fill in Stack with actual versions
  [ ] Fill in Key Commands (test what works)
  [ ] Fill in Important Files with real paths
  [ ] Add environment variables
  [ ] Add at least 2 constraints/gotchas
  [ ] Write a Current Focus paragraph
  [ ] Delete this checklist
-->

> Keep this file lean. Only include things Claude needs in EVERY session.
> Ad-hoc context belongs in docs/ and gets @-referenced when needed.

## What This Is
[One paragraph: what the project does and who uses it]

## Stack
- **Runtime**: Node.js [version]
- **Framework**: Next.js [version] / [other]
- **Language**: TypeScript (strict)
- **Database**: [e.g. Postgres via Prisma / Supabase]
- **Auth**: [e.g. NextAuth / Clerk]
- **AI**: Anthropic API (`claude-sonnet-4-6` default)

## Key Commands
```bash
npm run dev        # start dev server
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # run tests
```

## Important Files / Paths
```
src/
  app/             # Next.js App Router pages
  components/      # shared UI components
  lib/             # utilities, API clients
  actions/         # server actions
docs/
  features/        # one folder per feature (RESEARCH, BRAINSTORM, PLAN, EXECUTION_LOG)
  solutions/       # reusable patterns from /compound
  reference/       # system docs (commands, agents, workflows, file structure)
.claude/
  agents/          # project-specific agents
  skills/          # project-specific skills
  memory/
    session-log.md # session history
```

## Environment Variables
```
ANTHROPIC_API_KEY=
# add others here
```

## Constraints / Watch Out For
- [e.g. "All DB calls go through src/lib/db.ts — never import prisma directly"]
- [e.g. "Don't use React Server Components for anything with client state"]
- [add project-specific gotchas here]

## Lessons
<!-- Add rules here when Claude makes a mistake worth preventing next time -->
<!-- Format: "Do NOT [wrong thing]. Instead, [correct thing]." -->

## Current Focus
[What's actively being worked on — update each session]
