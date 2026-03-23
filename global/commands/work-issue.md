# /work-issue

Full dev cycle orchestrator. Takes a GitHub issue number, loads all context, plans the work, and closes the loop.

**Reads project-specific config from the `## Project Config` block in the project's CLAUDE.md.** If no config exists, ask the user for base branch and test commands.

## Steps

### 1. Load Context
- Fetch the GitHub issue with ALL comments: `gh issue view {number} --json title,body,labels,assignees,comments`
- **Read ALL comments** — look for CI triage bot analysis with: type, priority, scope, branch name, Notion link, files involved, recommended approach
- Extract from triage comment: branch name, PM task URL, file list, recommended approach
- If no triage comment exists, do your own quick assessment
- If `pm_tool: notion` in Project Config: find the Notion task (look for notion.so URL in comments or search Notion for the issue title), fetch its content
- Show the user a summary: issue title, type, priority, triage findings, recommended approach

### 2. Checkout & Rebase
- Read `base_branch` from Project Config (default: `main`)
- **Use the branch name from the triage comment** if it exists — CI already created it
- Fetch and checkout: `git fetch origin && git checkout -b {branch} origin/{branch}`
- If no branch exists, check remote: `git branch -r | grep {number}`
- Only create a new branch if none exists: `git checkout -b {type}/{number}-{short-desc} origin/{base_branch}`
- Rebase onto latest base branch: `git rebase origin/{base_branch}`

### 3. Update PM to In Progress
- If `pm_tool: notion`: update Notion task status to "In Progress" using `mcp__claude_ai_Notion__notion-update-page`
- If `pm_tool: none` or not set: skip this step

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

### 6. Update PM with Plan
- If `pm_tool: notion`: replace generic subtasks with specific implementation steps, add risks as notes
- If no PM: skip

### 7. Determine Approach — ASK the user
Based on the analysis, recommend one of:
- **`/fix`** — small scope, clear path, 1-2 files
- **`/plan`** — medium scope, needs a written plan before coding
- **`/brainstorm`** — large scope, vague requirements, multiple approaches

Present the recommendation and **ask the user to confirm**. Ask any clarifying questions.

**For `/plan` or `/brainstorm`:** After the brainstorm/plan is written and approved, update PM with DETAILED subtasks BEFORE starting implementation.

### 8. Do the Work
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

### 9. Review
- Show a summary of all files changed and why
- Run tests/linting one final time
- Ask the user if they want to review before committing

### 10. Commit & Push
- Stage the relevant files (not `.env`, credentials, etc.)
- Commit with clear message — only tag issue number if directly related
- **Do NOT push** — show the user the commit and let them push:
  ```
  Ready to push. Run:
  git push origin {branch-name}
  ```

### 11. Update PM Task
- If `pm_tool: notion`:
  - **Update content BEFORE status** — never just flip to Done
  - Check off completed subtasks (`- [ ]` → `- [x]`); note skipped with reason
  - Add new subtasks that emerged
  - Append completion note: date, summary, root cause if bug fix
  - If ALL subtasks done: Status → "Done"
  - If some remain: keep "In Progress", note what's left
- If no PM: skip

### 12. Wrap Up
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
- NEVER push without showing the user what's being pushed
- NEVER skip the PM update if pm_tool is configured
- If the issue is bigger than expected (10+ files, architectural decisions), stop and recommend breaking into sub-issues

$ARGUMENTS
