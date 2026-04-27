---
name: work-issue
description: "Full dev cycle orchestrator. Takes a GitHub issue number, loads all context, plans the work, and closes the loop."
disable-model-invocation: true
---

Full dev cycle orchestrator. Takes a GitHub issue number, loads all context, plans the work, and closes the loop.

**Reads project-specific config from the `## Project Config` block in the project's CLAUDE.md.** If no config exists, ask the user for base branch and test commands.

## Steps

### 1. Load Context
- Fetch the GitHub issue with ALL comments: `gh issue view {number} --json title,body,labels,assignees,comments`
- **Read ALL comments** — look for CI triage bot analysis with: type, priority, scope, suggested branch name, files involved, recommended approach
- Extract from triage comment: suggested branch name, file list, recommended approach
- If no triage comment exists, do your own quick assessment and derive a branch name yourself
- **Assign to current user** if not already assigned: `gh issue edit {number} --add-assignee "@me"`
- **Backfill type label** if missing (`bug`, `enhancement`, or `documentation`): classify from the issue content and add via `gh issue edit {number} --add-label {type}`
- Show the user a summary: issue title, type, priority, triage findings, recommended approach

### 2. Checkout & Rebase
- Read `base_branch` from Project Config (default: `develop`, fallback `main`)
- Determine `{branch}` name: use the suggested branch from the triage comment if present, otherwise derive `{type}/{number}-{short-desc}` from the issue.

**`/work-issue` is responsible for creating the branch.** The triage bot only suggests a name. Branch creation happens here, off `base_branch`, right before work starts.

1. **Fetch latest**: `git fetch origin`
2. **Update base branch**: `git checkout {base_branch} && git pull origin {base_branch}`
3. **Create or resume the feature branch**:
   - **If the branch already exists on origin** (resuming work): `git checkout {branch} --track origin/{branch}`
     - If a local branch already exists: `git checkout {branch} && git branch -u origin/{branch}`
   - **If neither local nor remote exists** (new work — the common case): `git checkout -b {branch} {base_branch}`
4. **Rebase onto base** (only if branch already had commits): `git rebase {base_branch}`
5. If rebase conflicts occur, stop and ask the user — do NOT force through

> **Common mistake:** Do NOT use `git checkout -b {branch} origin/{branch}` to track a remote — this creates a new local branch that doesn't track. Use `--track` instead.

### 3. Post Work Plan to Issue

Post a **detailed, well-formatted work plan** as a comment on the GitHub issue. This is NOT optional — the issue must reflect what we're about to do BEFORE we start coding.

```bash
gh issue comment {number} --body "$(cat <<'EOF'
## Work Plan

**Branch:** `{branch-name}`
**Date Started:** {YYYY-MM-DD}

### Scope
- {One-line summary of what this change does and why}

### Approach
- {Step-by-step description of what will be changed}
- {Which files/modules are affected}
- {Key decisions or tradeoffs}

### Subtasks
- [ ] {Concrete implementation step 1}
- [ ] {Concrete implementation step 2}
- [ ] {Concrete implementation step 3}
- [ ] Run tests and verify
- [ ] Code review / commit

### Risks & Gotchas
- {Anything non-obvious discovered during analysis}
EOF
)"
```

If `pm_tool: github-projects` in Project Config, also move the issue on the project board:
1. Add issue to project (if not already): `gh project item-add {github_project_number} --owner {org} --url {issue_url}`
2. Get the item ID and status field ID:
   ```bash
   gh project field-list {github_project_number} --owner {org} --format json
   gh project item-list {github_project_number} --owner {org} --format json
   ```
3. Set status to **In Progress** (or the equivalent from `github_project_statuses` in Project Config):
   ```bash
   gh project item-edit --project-id {project_id} --id {item_id} --field-id {status_field_id} --single-select-option-id {option_id}
   ```

### 4. Deep Analysis
Before suggesting an approach, do a thorough codebase analysis:

1. **Identify affected files** — grep/glob for relevant code, read the files, understand current implementation
2. **Map the change surface** — which files need to change, which functions/endpoints are involved
3. **Check for gotchas** — look at related tests, migrations, frontend consumers
4. **Estimate scope** — small (1-2 files, < 30 min), medium (3-5 files), large (5+ files)

Present findings:
```
## Analysis

**What needs to change:**
- `file.py:function` — reason

**Risks / gotchas:**
- [anything non-obvious]

**Scope:** small / medium / large
```

### 5. Domain Classification

Classify the domain based on affected files from step 4 and issue labels:

**Frontend signals:** `.tsx`, `.jsx`, `.css`, `components/`, `pages/`, `app/`, UI/design/layout keywords
**Backend signals:** `.py`, `.ex`, `.ts` (non-component), `api/`, `services/`, `lib/`, API/database/auth keywords
**Infra signals:** `.tf`, `.hcl`, `infra/`, `terraform/`, `.github/workflows/`, Dockerfile, IaC/deploy/CI keywords
**iOS signals:** `.swift`, `Sources/`, `.xcodeproj`, `.xcworkspace`, SwiftUI/UIKit/Xcode keywords

**Classification rules:**
- If `dev_domain` exists in Project Config, use as default
- If files clearly map to one domain, classify automatically
- If multiple domains detected, ask: "Is this primarily frontend, backend, infra, or iOS? I'll load the right specialist."
- If unclear, ask before proceeding

**Present the classification:**
```
Domain:      [Frontend | Backend | Infra | iOS | Multi: X + Y]
Specialist:  [frontend-specialist | backend-specialist | infra-specialist | ios-specialist]
Standards:   [2-4 most relevant skills for this task]
Context:     [file summary — e.g. "3 files in src/api/, 1 migration"]
```

Ask the user to confirm the domain classification before proceeding.

### 6. Determine Approach — ASK the user
Based on the analysis, recommend one of:
- **`/fix`** — small scope, clear path, 1-2 files
- **`/plan`** — medium scope, needs a written plan before coding
- **`/brainstorm`** — large scope, vague requirements, multiple approaches

Present the recommendation and **ask the user to confirm**. Ask any clarifying questions.

### 7. Do the Work
Execute the chosen approach using the classified domain specialist:

**Small scope (`/fix`):** Load the domain standards skill inline and implement in the main session.
- Frontend → load `frontend-standards` skill
- Backend → load `backend-standards` skill
- Infra → load `infra-standards` skill
- iOS → load `ios-standards` skill

**Medium/Large scope (`/plan` or `/brainstorm`):** After plan is written and approved, delegate implementation to the domain specialist agent:
- Frontend → `frontend-specialist` agent (preloads: frontend-standards, ts-component, api-route, nodejs)
- Backend → `backend-specialist` agent (preloads: backend-standards, python, elixir, phoenix, database, error-handling)
- Infra → `infra-specialist` agent (preloads: infra-standards, terraform, docker-deploy, infisical, env-config)
- iOS → `ios-specialist` agent (preloads: ios-standards)

**Multi-domain:** Ask user which domain is primary, delegate to that specialist first, then handle secondary domain after.

Always:
- Run each command in `test_commands` from Project Config after changes
- Run each command in `build_commands` from Project Config if relevant files changed

### 8. Review
- Show a summary of all files changed and why
- Run tests/linting one final time
- Ask the user if they want to review before committing

### 9. Commit & Push
- Stage the relevant files (not `.env`, credentials, etc.)
- Commit with clear message — only tag issue number if directly related
- **Do NOT push** — show the user the commit and let them push:
  ```
  Ready to push. Run:
  git push origin {branch-name}
  ```

### 10. Completion Update — MANDATORY

> **THIS STEP IS NOT OPTIONAL.** Do NOT skip this step. Do NOT proceed to step 11 without completing this. Every work-issue session MUST end with a completion update on the issue.

Post a **completion comment** on the GitHub issue:

```bash
gh issue comment {number} --body "$(cat <<'EOF'
## Completion Notes — {YYYY-MM-DD}

### What Was Done
- {Specific change 1 — what file/module, what changed, why}
- {Specific change 2}

### Root Cause (if bug fix)
- {What was actually wrong and why}

### Issues Encountered
- {Problems hit during implementation and how they were resolved}

### Discovered Issues
- {Bugs, tech debt, or risks found while debugging that were NOT part of this task}
- {For each: severity estimate and whether a new issue was created}

### Files Changed
- `{path/to/file.ts}` — {one-line summary of change}
EOF
)"
```

If `pm_tool: github-projects`, move the issue on the project board (use `github_project_statuses` from Project Config for valid columns):
- Ready for review → move to **In Review**
- ALL work done → move to **Done**
- Partially done → keep **In Progress**, note what's left
- Blocked → note the blocker in a comment

For discovered issues: offer to create new GitHub issues — these are valuable and should not be lost.

### 11. Wrap Up
Ask the user:
- **Continue?** Pick up another issue (`/work-issue {next}`)
- **End session?** Run `/end-session` to save learnings
- **Compound?** If a reusable pattern was discovered, run `/compound`

## Usage
```
/work-issue 85          — work on issue #85
/work-issue 84          — work on issue #84
```

## Rules
- ALWAYS do deep analysis before suggesting an approach
- ALWAYS ask clarifying questions before starting work
- ALWAYS rebase onto latest base branch before starting
- ALWAYS run test_commands after changes
- ALWAYS post a work plan comment on the issue BEFORE starting implementation (step 3)
- ALWAYS post a completion comment on the issue AFTER finishing work (step 10) — this is the #1 most skipped step and it MUST happen
- ALWAYS offer to create new issues for problems discovered during debugging
- NEVER push without showing the user what's being pushed
- NEVER skip the completion update — not for "small" changes, not for "quick" fixes, NEVER
- If the issue is bigger than expected (10+ files, architectural decisions), stop and recommend breaking into sub-issues

$ARGUMENTS
