# [Project Name]

> Replace this file with project-specific context. Keep it lean.
> Only include things Claude needs in EVERY session for this project.
> Anything ad-hoc belongs in docs/ and gets @-referenced when needed.

## What This Is
[One paragraph: what the project does and who uses it]

## Stack
- **Runtime**: Node.js [version]
- **Framework**: Next.js [version] / [other]
- **Language**: TypeScript (strict)
- **Database**: [e.g. Postgres via Prisma / Supabase]
- **Auth**: [e.g. NextAuth / Clerk]
- **AI**: Anthropic API (`claude-sonnet-4-20250514` default)

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
  architecture.md  # system design decisions
  [feature].md     # per-feature notes
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

## Current Focus
[What's actively being worked on — update each session]
