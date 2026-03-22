# [Project Name]

<!-- FIRST SESSION: Run /setup to fill this in interactively, or do it manually.
     Delete this comment block when done. -->

> This file is loaded into every Claude session. Keep it lean and accurate.
> For how the workflow system works, see `docs/reference/`.

## What This Is
<!-- What does this project do? Who uses it? One paragraph. -->

## Stack
<!-- List the actual languages, frameworks, and tools. Examples:
     - Python 3.12, FastAPI, pydantic v2, SQLite (aiosqlite)
     - Elixir 1.17, Phoenix 1.7, Ash 3.x, Postgres
     - TypeScript, Next.js 14, React, Prisma
     - Terraform, HCL, custom Clerk provider
     - Go 1.22, chi router
     Delete these comments and replace with your stack. -->

## Key Commands
<!-- What commands does Claude need to build, test, lint, and run this project?
     Examples:
       mix test              # run tests
       pytest -x -v          # run tests
       npm run dev           # start dev server
       docker compose up -d  # start services
     Delete these comments and replace with your commands. -->

## Important Paths
<!-- Which directories and files matter? Only list non-obvious ones.
     The docs/ structure is standard across all projects:
       docs/features/    — one folder per feature (RESEARCH, BRAINSTORM, PLAN, EXECUTION_LOG)
       docs/solutions/   — reusable patterns from /compound
       docs/reference/   — system docs (commands, agents, workflows, file structure)
     Delete these comments and list your project-specific paths. -->

## Project Config
<!-- Integration config for global commands (/work-issue, /board, /backlog-notion, /update-notion-task).
     Fill in the values relevant to your project. Delete unused sections.
     Run /setup to fill this in interactively. -->
```yaml
pm_tool: none                            # notion | linear | github-projects | none
base_branch: main                        # branch all work starts from
test_commands:
  - echo "no tests configured"
# build_commands:
#   - npm run build

# Notion integration (only if pm_tool: notion)
# notion_datasource: <data-source-id>
# notion_project: https://www.notion.so/<project-page-id>
# notion_goal: https://www.notion.so/<goal-page-id>
# notion_pillar: https://www.notion.so/<pillar-page-id>
# notion_assignee: user://<user-id>
# notion_statuses: [Not started, In Progress, Done]
# notion_kanban_view: view://<view-id>

# GitHub issue types (optional — for GraphQL type assignment)
# github_issue_types:
#   bug: <type-id>
#   feature: <type-id>
#   task: <type-id>
```

## Constraints
<!-- Project-specific rules and gotchas. Things Claude would get wrong without being told.
     TIP: If a rule only applies to certain directories, move it to
     .claude/rules/[name].md with paths: frontmatter. Keep this file under 200 lines. -->

## Lessons
<!-- Add rules here when Claude makes a mistake worth preventing next time.
     Format: "Do NOT [wrong thing]. Instead, [correct thing]." -->
