# /work-issue

Full dev cycle orchestrator. Takes a GitHub issue number, loads all context, plans the work, and closes the loop.

**Reads project-specific config from the `## Project Config` block in the project's CLAUDE.md.** If no config exists, ask the user for base branch and test commands.

## Steps

### 1. Load Context
- Fetch the GitHub issue with ALL comments: `gh issue view {number} --json title,body,labels,assignees,comments`
- **Read ALL comments** — look for CI triage bot analysis with: type, priority, scope, branch name, Notion link, files involved, recommended approach
- Extract from triage comment: branch name, PM task URL, file list, recommended approach
- If no triage comment exists, do your own quick assessment
- Show the user a summary: issue title, type, priority, triage findings, recommended approach

#### Notion Task — Find or Create
If `pm_tool: notion` in Project Config:

1. **Search for existing task**: look for `notion.so` URL in issue comments first, then `mcp__claude_ai_Notion__notion-search` with the issue title
2. **If found**: fetch its content with `mcp__claude_ai_Notion__notion-fetch`
3. **If NOT found**: create one immediately using `mcp__claude_ai_Notion__notion-create-pages`:
   - Use `notion_datasource`, `notion_project`, `notion_goal`, `notion_pillar`, `notion_assignee` from Project Config
   - Name: issue title (under 60 chars)
   - Status: `In Progress`
   - Priority: map from issue labels or default `P3 - Medium`
   - Content: placeholder with issue link — will be filled in step 3
   - Add the new Notion link as a comment on the GitHub issue: `gh issue comment {number} --body "Notion task: {notion_url}"`

### 2. Checkout & Rebase
- Read `base_branch` from Project Config (default: `develop`, fallback `main`)

**The branch already exists on origin** — the triage bot creates it. Use the branch name from the GitHub issue / triage comment. Do NOT create a new branch unless you've confirmed none exists.

1. **Fetch latest**: `git fetch origin`
2. **Checkout the existing remote branch with tracking**:
   ```
   git checkout {branch} --track origin/{branch}
   ```
   - If that fails because a local branch already exists: `git checkout {branch} && git branch -u origin/{branch}`
   - Only if NO branch exists anywhere (local or remote): `git checkout -b {type}/{number}-{short-desc} origin/{base_branch}`
3. **Update base branch**: `git checkout {base_branch} && git pull origin {base_branch}`
4. **Rebase feature branch on top of base**: `git checkout {branch} && git rebase {base_branch}`
5. If rebase conflicts occur, stop and ask the user — do NOT force through

> **Common mistake:** Do NOT use `git checkout -b {branch} origin/{branch}` — this creates a new local branch that doesn't track the remote. Use `--track` to set up tracking correctly.

### 3. Update Notion Task with Work Plan
If `pm_tool: notion`:

Update the Notion task with a **detailed, well-formatted work plan** using `mcp__claude_ai_Notion__notion-update-page`. This is NOT optional — the task must reflect what we're about to do BEFORE we start coding.

Set status to `In Progress` and write the following content structure:

```markdown
## Work Plan

**Issue:** #{number} — {title}
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
```

**Formatting rules for Notion content:**
- **CRITICAL**: The `new_str` / content field must contain **actual newlines**, not escaped `\n` literals. Escaped `\n` renders as one giant blob in Notion. Use real multi-line strings.
- Use headers (`##`, `###`) to separate sections — never a wall of text
- Subtasks as `- [ ]` checkboxes — every task needs at least 3
- Bold key terms and file paths
- Keep each bullet under 2 lines
- Always `notion-fetch` after updating to verify the content rendered correctly
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

### 6. Refine Notion Subtasks from Plan
- If `pm_tool: notion` AND the user chose `/plan` or `/brainstorm`: update the Notion task subtasks to match the approved plan's implementation steps — replace any generic items with specific ones from the plan doc
- If no PM or `/fix` path: skip

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

### 11. Update Notion Task — MANDATORY Completion Update

> **THIS STEP IS NOT OPTIONAL.** Do NOT skip this step. Do NOT proceed to step 12 without completing this. Every work-issue session MUST end with a detailed Notion update. This is the most commonly skipped step and it causes major information loss.

If `pm_tool: notion`:

1. **Fetch the current task content** with `mcp__claude_ai_Notion__notion-fetch`
2. **Update content BEFORE status** using `mcp__claude_ai_Notion__notion-update-page` — append a well-formatted completion section:

```markdown
## Completion Notes — {YYYY-MM-DD}

### What Was Done
- {Specific change 1 — what file/module, what changed, why}
- {Specific change 2}
- {etc.}

### Root Cause (if bug fix)
- {What was actually wrong and why}

### Issues Encountered
- {Problems hit during implementation and how they were resolved}

### Discovered Issues
- {Bugs, tech debt, or risks found while debugging that were NOT part of this task}
- {For each: severity estimate and whether it was added to the board}

### Files Changed
- `{path/to/file.ts}` — {one-line summary of change}
```

3. **Check off completed subtasks**: `- [ ]` → `- [x]` for each done item
4. **Note skipped subtasks** with reason — don't just leave them unchecked
5. **Add any new subtasks** that emerged during work
6. **For discovered issues**: offer to create new tasks via `/backlog-notion` — these are valuable and should not be lost
7. **Update status**:
   - ALL subtasks done → Status: `Done`
   - Some remain → keep `In Progress`, note what's left in the completion section

**Formatting rules:**
- **CRITICAL**: Content must use **actual newlines**, not escaped `\n` — escaped newlines render as one blob in Notion
- Use `##` and `###` headers — never dump a paragraph
- Bold file paths and key terms
- Each bullet is one concrete fact, not a vague summary
- Include enough detail that someone reading the task 2 weeks later understands what happened
- Always `notion-fetch` after updating to verify it rendered correctly

If no PM: skip

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
- ALWAYS write a detailed work plan to Notion BEFORE starting implementation (step 3)
- ALWAYS write a detailed completion update to Notion AFTER finishing work (step 11) — this is the #1 most skipped step and it MUST happen
- ALWAYS offer to create new tasks for issues discovered during debugging
- NEVER push without showing the user what's being pushed
- NEVER skip the Notion update if pm_tool is configured — not for "small" changes, not for "quick" fixes, NEVER
- NEVER flip a Notion task to Done without writing completion notes first
- If the issue is bigger than expected (10+ files, architectural decisions), stop and recommend breaking into sub-issues

$ARGUMENTS
