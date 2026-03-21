# Ops Manual Integration — Brainstorm

> Comparing `claud-ops-manual.md` best practices against our actual global setup and real-world usage in bd-tracker.
> Goal: identify what to adopt, what we already do, what's bad, and how to integrate the good stuff.

---

## Evidence Base

- **bd-tracker**: 18 feature folders, 239-line CLAUDE.md, 4 custom commands (/work-issue, /board, /backlog-notion, /update-notion-task), CI triage prompt, 344 tests, 38 migrations, 8+ sessions logged
- **claude-setup**: 10 agents, 18 commands, 17 skills, 3 hooks
- **Ops manual**: 487-line reference doc covering two-layer architecture, permissions, setup protocol, decision trees, anti-patterns

---

## 1. Things We Already Do Well

| Practice | Ops Manual Says | Our Status |
|----------|----------------|------------|
| Two-layer architecture (global + project) | Core principle | Fully implemented. install-claude-setup → ~/.claude/, init-claude-setup → project .claude/ |
| Commands, agents, skills structure | Separate concerns by type | 10 agents, 18 commands, 17 skills — well-organized |
| Session memory | Track changes, log sessions | PostToolUse hook + Stop hook + /end-session + /catchup |
| Feature doc lifecycle | Research → Brainstorm → Plan → Execute | docs/features/ with proper structure in bd-tracker |
| Project-specific commands | Build what the project needs | bd-tracker's /work-issue, /board, /backlog-notion are excellent examples |
| New repo setup | Interactive walkthrough | /setup command exists |
| Template for project CLAUDE.md | Structured, fill-in-the-blanks | project-template/.claude/CLAUDE.md with guided comments |

**Verdict**: Our foundation is solid. The ops manual validates our architecture.

---

## 2. Critical Gaps — We Should Adopt These

### 2a. Permissions in settings.json (HIGH PRIORITY)

**What the ops manual says**: Every settings.json should have explicit `allow` and `deny` lists. `.env` deny rules and destructive git denials are "non-negotiable."

**What we have**: Our settings.json files contain ONLY hooks. Zero permissions. No deny rules at all.

```json
// Current global/settings.json — hooks only, no permissions
{
  "hooks": { ... },
  "model": "opus",
  "subagentModel": "sonnet"
}
```

**Risk**: Claude can `rm -rf`, `git push --force`, read `.env` files, `curl` arbitrary URLs — all without any guardrails.

**Recommendation**: Adopt the ops manual's permission model. Add to both global and project template:

```json
// Proposed additions to global/settings.json
"permissions": {
  "allow": [
    "Read",
    "Glob",
    "Grep"
  ],
  "deny": [
    "Bash(rm -rf *)",
    "Bash(git push --force *)",
    "Bash(git reset --hard *)",
    "Bash(git clean *)",
    "Read(./.env)",
    "Read(./.env.*)",
    "Read(**/secrets/**)"
  ]
}
```

Project-level settings.json would expand `allow` for project-specific commands (e.g., `Bash(python -m pytest *)`, `Bash(npm run *)`).

**Effort**: Small. High impact.

---

### 2b. Path-Scoped Rules (.claude/rules/) (HIGH PRIORITY)

**What the ops manual says**: When a rule only applies to certain files/directories, move it to `.claude/rules/[name].md` with `paths` frontmatter. Keeps CLAUDE.md lean.

**What we have**: No rules/ directory anywhere. Everything lives in CLAUDE.md.

**bd-tracker evidence**: The CLAUDE.md is 239 lines (over the 200-line limit). It contains detailed sections that are clearly path-scopeable:
- Attachment analysis details → scope to `src/ingestion/`
- RBAC permission matrix → scope to `src/api/`
- Scoring algorithm → scope to `src/db/crud.py`, `src/models/`
- Deployment details → scope to `docker-compose*.yml`, `Dockerfile`
- Frontend auth patterns → scope to `frontend/src/`

**Recommendation**:
1. Add `.claude/rules/` to the project template
2. Add a rule template with paths frontmatter to the ops manual
3. Create a `/audit-config` command that flags CLAUDE.md over 200 lines and suggests splits
4. For bd-tracker specifically, split into ~5 rules files and get CLAUDE.md under 150 lines

**Effort**: Medium. Very high impact on context quality — Claude gets the right rules for the right files.

---

### 2c. CLAUDE.md Size Management (MEDIUM PRIORITY)

**What the ops manual says**: Global CLAUDE.md max 150 lines. Project CLAUDE.md max 200 lines. When over, split to rules/, extract to skills, or move universal rules up to global.

**What we have**: No size enforcement or guidance anywhere. bd-tracker is at 239 lines. Global is at 73 lines (fine).

**Recommendation**:
1. Add size limits to the project template comments
2. Add a check to /end-session or create /audit-config that warns when CLAUDE.md is over limit
3. Document the split strategy in the project template (where the ops manual's "When CLAUDE.md is Getting Too Long" section is excellent)

---

### 2d. Config Update Protocol (MEDIUM PRIORITY)

**What the ops manual says**: Before updating CLAUDE.md — read first, identify changes, present diff, get approval, confirm line count.

**What we have**: /end-session updates "Current Focus" but there's no formal protocol for CLAUDE.md changes. The memory-updater agent just appends.

**Recommendation**: Integrate the ops manual's update protocol into the memory-updater agent. Before any CLAUDE.md edit:
1. Check current line count
2. If edit would push over limit, suggest what to split out
3. Show proposed changes before writing

---

## 3. Good Ideas — Adopt Selectively

### 3a. Decision Tree for Placement

**What the ops manual says**: Flowchart for "where does this rule go?" — universal → global, path-specific → rules/, workflow → command/skill, isolated context → agent, machine-specific → local.

**What we have**: Implicit knowledge. Not documented anywhere the user or Claude can reference.

**Recommendation**: Add this decision tree to the global CLAUDE.md or as a reference doc. Compact version — 10-15 lines, not a separate doc.

**Where it goes**: `project-template/docs/reference/file-structure.md` already exists — extend it with placement guidance.

---

### 3b. Anti-Patterns Checklist

**What the ops manual says**: Three tables of anti-patterns (config, permissions, behavior).

**What we have**: `## Lessons` section in CLAUDE.md (empty, just comments). No proactive anti-pattern enforcement.

**Recommendation**: Cherry-pick the best anti-patterns into global CLAUDE.md `## Lessons` section:
- "Do NOT put generic rules in project CLAUDE.md. Move to ~/.claude/CLAUDE.md."
- "Do NOT restate linter/formatter rules. Reference the config file."
- "Do NOT write CLAUDE.md over 200 lines. Split to .claude/rules/."
- "Do NOT make changes to multiple files without presenting a plan."

These are concrete, enforceable. The rest are either already handled by our workflow or too generic.

---

### 3c. Local Overrides Pattern (LOW PRIORITY)

**What the ops manual says**: `CLAUDE.local.md` and `settings.local.json` for machine-specific overrides, always gitignored.

**What we have**: `settings.local.json` exists in bd-tracker. `CLAUDE.local.md` pattern exists in the ops manual's .gitignore section but we don't template it.

**Recommendation**: Add `CLAUDE.local.md` to gitignore template. Mention it in /setup. Don't over-engineer — this matters more when there's a team.

---

### 3d. Agent Tool Restrictions

**What the ops manual says**: "Always set `tools` explicitly. Never leave it open-ended. A read-only agent gets Read, Grep, Glob and nothing else."

**What we have**: Mixed. Some agents (code-reviewer) probably don't need Write access. The researcher agent shouldn't need Edit.

**Recommendation**: Audit all 10 agents and tighten tool lists. Good hygiene but low urgency.

---

## 4. Bad Ideas / Skip These

### 4a. Overly Prescriptive Setup Protocol

**What the ops manual says**: 8 rigid steps for new repo setup, "do not skip steps, do not proceed to the next step without completing the current one."

**Our take**: Our /setup command is interactive and flexible. The 8-step protocol is too rigid for a solo dev / small team. It's more suited to a large org where you're onboarding people who don't understand the system.

**Verdict**: Skip. Our /setup is better for our context.

---

### 4b. Global settings.json as Read-Only Baseline

**What the ops manual says**: Global settings.json should only allow Read, Glob, Grep. Everything else denied globally, expanded per-project.

**Our take**: Too restrictive for a power user. Our hooks (track-changes, session-end, guard-bash) need Write/Edit to function. We'd be constantly fighting the permissions.

**Verdict**: Keep our global settings.json as hooks + model config. Add deny rules for the dangerous stuff, but don't restrict allow at the global level.

---

### 4c. "Never Remove a Deny Rule Without Explicit Instruction"

**Our take**: Good principle for a team. Overkill for a solo dev who IS the explicit instruction. Our guard-bash hook already covers the most dangerous commands.

**Verdict**: Adopt the deny rules but don't add ceremony around modifying them.

---

## 5. Improvements From Usage Patterns

These aren't from the ops manual — they're from analyzing how bd-tracker actually uses the system.

### 5a. Session Log Stub Accumulation (FIX NEEDED)

**Problem**: The Stop hook creates empty session stubs every time Claude exits. bd-tracker's session-log.md has 5+ empty stubs at the bottom:
```markdown
## Session 2026-03-20 (67f0fc57)
> Auto-captured on Stop. Edit or delete stale entries freely.
<!-- Claude: summarize what was built... -->
```

These accumulate when /end-session is skipped (which happens a lot — 5 stubs vs 8 real entries).

**Fix options**:
1. Make the Stop hook check if /end-session already ran this session (flag file) — skip stub if so
2. Make /catchup clean up empty stubs on session start
3. Make /end-session the ONLY thing that writes to session-log (remove stub from Stop hook)

**Recommendation**: Option 3. The Stop hook stub was meant as a safety net but it just creates noise. If /end-session wasn't run, /sync-memory already covers backfilling from git.

---

### 5b. Execution Logs Are Rarely Created (WORKFLOW GAP)

**Problem**: Only 4 of 18 features in bd-tracker have EXECUTION_LOG.md. The other 14 were built without /execute — likely via /fix or ad-hoc coding.

**Analysis**: This makes sense. Most bd-tracker work is issue-driven via /work-issue, which routes to /fix for small tasks. /execute is for planned features. The workflow is working as intended — not every feature needs the full pipeline.

**Recommendation**: Not a bug. But the feature folders without execution logs could benefit from a lightweight "completion note" — maybe /work-issue should append a one-liner to the feature folder when it closes an issue that maps to a feature.

---

### 5c. /compound Is Never Used (ADOPTION GAP)

**Problem**: Zero docs/solutions/ in bd-tracker. 18 features built, dozens of patterns discovered (Outlook email rendering, Graph API delegated tokens, WAL backup scripts, URL param patterns), but none captured via /compound.

**Why**: /compound requires a conscious decision to stop and document. In the flow of /work-issue → next issue, there's no natural trigger.

**Fix options**:
1. Add a "compound?" prompt to /work-issue step 11 (already there, but easy to skip)
2. Add compound suggestions to /end-session — scan session-log for gotchas/patterns that repeat
3. Create a /retrospective command that reviews the last N sessions and suggests compounds

**Recommendation**: Option 2. Make /end-session's memory-updater agent also flag "patterns worth compounding" and ask. Low friction, natural touchpoint.

---

### 5d. BACKLOG.md Gets Stale (PROCESS GAP)

**Problem**: bd-tracker's BACKLOG.md was last updated March 16. Many items are now complete (RBAC, backfill auth, admin roles, weekly email, user photos). The Notion board is the real source of truth.

**Recommendation**: Either:
1. Kill BACKLOG.md and use /board exclusively (Notion is source of truth)
2. Make /board update BACKLOG.md when run (sync from Notion → markdown)

Option 1 is simpler. BACKLOG.md was useful before the Notion integration. Now it's duplicate state.

---

### 5e. Notion ID Duplication (DRY VIOLATION)

**Problem**: bd-tracker hardcodes the same Notion IDs in 4 places: /work-issue, /board, /backlog-notion, /update-notion-task, and ci-triage.md. If the board changes, you update 5 files.

**Recommendation**: Add a `## Notion Config` section to the project CLAUDE.md with all IDs in one place. Commands reference "see Notion Config in CLAUDE.md" instead of embedding IDs.

Or better: create a `.claude/config.md` or section that commands can reference. This is a pattern worth adding to the global setup.

---

## 6. Proposed Action Items (Priority Order)

### Immediate (this session or next)

1. **Add deny rules to global/settings.json** — rm -rf, force push, .env reads
2. **Add .claude/rules/ to project template** — with example rule file showing paths frontmatter
3. **Fix Stop hook stub accumulation** — remove session-log stub from Stop hook, rely on /end-session + /sync-memory
4. **Add placement decision tree** to file-structure.md reference doc

### Soon (next few sessions)

5. **Split bd-tracker CLAUDE.md** — extract 5+ rules files, get under 150 lines
6. **Create /audit-config command** — checks CLAUDE.md line count, flags stale sections, suggests splits
7. **Enhance /end-session** — add compound suggestions based on session gotchas
8. **Centralize Notion IDs** in bd-tracker CLAUDE.md, update commands to reference it

### Later (when it matters)

9. **Audit agent tool restrictions** — tighten tools on read-only agents
10. **Add CLAUDE.local.md** pattern to template + .gitignore
11. **Kill BACKLOG.md** in bd-tracker (Notion is source of truth)
12. **Add anti-pattern lessons** to global CLAUDE.md `## Lessons` section

---

## 7. What the Ops Manual Gets Right That We Should Formalize

The ops manual is best thought of as a **meta-skill** — instructions for how Claude should manage its own configuration. The best parts aren't about what files to create, but about **when and how to change them**.

Key principles to absorb into our system:
- **Read before write** — always read current state before proposing changes to any config file
- **Present before execute** — show diffs for CLAUDE.md changes, don't just write
- **Size limits are real** — context window matters, bloated CLAUDE.md = diluted instructions
- **Staleness is the #1 enemy** — a stale CLAUDE.md is worse than a missing one
- **Path scoping is free precision** — rules/ files with paths frontmatter give Claude exactly what it needs for the files it's editing

These should become lessons in global CLAUDE.md, not a separate ops manual document.

---

*Generated 2026-03-21 from analysis of claude-setup, bd-tracker, and claud-ops-manual.md*
