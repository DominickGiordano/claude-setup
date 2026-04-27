---
name: status
description: "Show project status — local feature plans and (if configured) the GitHub project board."
disable-model-invocation: true
---

Show project status. Default shows both **Features** (local `docs/features/*/PLAN.md`) and **Board** (GitHub project, if `pm_tool: github-projects` in Project Config). Flags below scope to one view.

## Usage

```
/status                  — both sections
/status --features       — local feature plans only
/status --board          — GitHub project board only
/status --board in-progress
/status --board blocked
/status --board todo
```

## Steps

### Features section (default + `--features`)

1. Glob `docs/features/*/PLAN.md`
2. For each plan, extract:
   - **Title** (from `# ` heading)
   - **Status** (from `Status:` line — Draft, Ready, In Progress, Blocked, Done)
   - **Last modified** (git or file timestamp)
3. List which docs exist per feature folder (RESEARCH, BRAINSTORM, PLAN, EXECUTION_LOG)
4. If `docs/solutions/` exists, count by category

Sort by status (In Progress → Ready → Blocked → Draft → Done).

```
## Features
| Status | Feature | Docs | Last Updated |
|--------|---------|------|-------------|
| 🔵 In Progress | feature-name | R B P E | 2026-04-26 |
| 🟢 Ready | other-feature | B P | 2026-04-25 |
| ⚪ Draft | idea | P | 2026-04-22 |
| ✅ Done | completed-thing | R B P E | 2026-04-19 |

Docs key: R=Research, B=Brainstorm, P=Plan, E=Execution Log

## Solutions (N total)
- auth: 3 docs
- deployment: 2 docs
```

If no feature docs, suggest `/brainstorm` or `/plan` to start.

### Board section (default + `--board [filter]`)

Read `pm_tool` and related config from `## Project Config`. If `pm_tool: github-projects`:

1. Query: `gh project item-list {github_project_number} --owner {org} --format json`
2. Group by status columns (use `github_project_statuses` from Project Config; default `[Backlog, Ready, In Progress, In Review, Done]`).
3. **ALWAYS use the table format below** — never bullets:

   ```
   ### In Progress (N)
   | Issue | Priority | Description | Assignee |
   |-------|----------|-------------|----------|
   | **#42 Task name** | P1 Critical | One-line summary | @user |
   ```

4. Sort by priority within each table (P1 → P2 → P3 → P4).
5. Done column: show last 5 only.
6. Summarize: items per status, highest-priority Todo, blocked items, suggested next pickup.

If `pm_tool: none` or unset: fall back to `gh issue list --state open --json number,title,labels,assignees` grouped by labels.

**Filter modes** (only with `--board`):
- `--board in-progress` — just the In Progress column
- `--board blocked` — just blocked items (label `blocked` or column `Blocked`)
- `--board todo` — Backlog + Ready columns

## Rules
- Keep output concise — this is a quick status check
- ALWAYS use table format for board sections — never bullets
- Sort by priority within each board section
- If no flag is given, show both sections; if `--features` or `--board` is given, only that one

$ARGUMENTS
