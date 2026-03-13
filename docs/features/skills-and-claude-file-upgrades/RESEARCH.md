# Claude Skills Upgrade Plan
**Source:** hoeem's Full Course on Claude Skills (March 2026)  
**Owner:** Dominick — Areté Capital Partners  
**Purpose:** Teach Claude how to audit, upgrade, and build skills correctly going forward

---

## What This Document Is

This is a standing instruction document for Claude. When Dominick asks to audit skills, build a new skill, or improve the setup, use this document as the playbook. Every section maps to a concrete action.

---

## Part 1 — Core Concepts to Know

### The Three-Layer Stack
| Layer | What It Is | Areté Example |
|-------|-----------|---------------|
| **Projects** | Knowledge base — static reference material | Brand guide PDFs, deal docs |
| **Skills** | Instruction manual — how to do a task | `jd-drafter`, `arete-resume-reviewer` |
| **MCP** | Connection layer — live data | Notion, PitchBook, Arilearn |

### Anatomy of a Skill
```
skill-name/           ← kebab-case folder name
├── SKILL.md          ← REQUIRED, case-sensitive, brain of the skill
├── references/       ← optional, one level deep only
│   └── ref-file.md
└── scripts/          ← optional, for computation tasks
    └── process.py
```

**Critical rules:**
- Folder: `kebab-case`, no spaces, no underscores, no capitals
- File: exactly `SKILL.md` — not `skill.md`, not `README.md`
- References: one level deep only — no reference file can link to another reference file
- Scripts: one job per script, accept file paths as CLI args, include error handling

---

## Part 2 — The YAML Description Rule (Most Important)

The `description` field in the YAML frontmatter is the single most critical line in any skill. Claude is conservative about activation — weak descriptions mean skills never fire.

### What a "pushy" description looks like:
```yaml
---
name: skill-name
description: >
  Does [specific thing]. Use this skill whenever the user says '[phrase 1]',
  '[phrase 2]', '[phrase 3]', '[phrase 4]', '[phrase 5]'. Also activate when
  the user uploads [file type] and asks for [action]. Do NOT use for [list
  every adjacent use case that should NOT trigger this skill].
---
```

### Requirements checklist for every description:
- [ ] Written in third person ("Processes..." not "I can...")
- [ ] 5–7+ explicit trigger phrases listed
- [ ] Negative boundaries defined (when NOT to fire)
- [ ] Over 50 words total
- [ ] No vague language — every trigger is specific and testable

---

## Part 3 — Audit Protocol for Existing Skills

Run this audit whenever Dominick asks to "review skills" or "check the skill library."

### Step 1 — Territory Map
For each deployed skill, define its territory in one sentence. List them and identify any overlaps.

### Step 2 — Trigger Phrase Collision Test
List every trigger phrase from every skill. Flag any phrase that could match more than one skill. For each collision, determine which skill owns the phrase and suggest an alternative for the other.

### Step 3 — Negative Boundary Audit
For each skill, check whether its negative boundaries explicitly exclude the territories of ALL other skills. Flag any missing exclusions.

### Step 4 — Ambiguous Request Test
Generate 5–10 realistic requests that are ambiguous (could match multiple skills). For each, predict which skill would fire and whether that's correct.

### Step 5 — Dead Zone Check
Identify common Areté use cases that would NOT trigger any deployed skill but should. Flag these as skill candidates.

---

## Part 4 — The 5 Failure Modes

When a skill isn't working, diagnose by category before making any changes:

| Failure Mode | Symptom | Root Cause | Fix |
|-------------|---------|-----------|-----|
| **Silent Skill** | Never fires | YAML description too weak | Add more explicit trigger phrases, make description pushier |
| **Hijacker** | Fires on wrong requests | Description too broad, missing negative boundaries | Add negative boundaries, tighten trigger phrases |
| **Drifter** | Fires but wrong output | Instructions are ambiguous | Replace vague language with specific, testable instructions |
| **Fragile Skill** | Works on clean input, breaks on edge cases | Edge case handling incomplete | Add explicit instructions for every failure scenario |
| **Overachiever** | Adds things not requested | No scope constraints | Add "Do NOT add X, Y, Z" constraints to output section |

---

## Part 5 — New Skill Build Sequence

When Dominick asks to build a new skill, follow this sequence. Do not skip steps.

### Step 1 — Define the Job (before writing anything)
Answer these three questions explicitly:
1. **What does this skill do?** Be ruthlessly specific — not "help with emails" but "draft cold outreach emails to LP prospects using Areté's voice and deal-specific context"
2. **When should it fire?** List 7+ exact phrases Dominick would type
3. **What does "good" look like?** Get a concrete before/after example

### Step 2 — Write the YAML Frontmatter
- `name`: kebab-case
- `description`: pushy, third-person, 5–7+ trigger phrases, negative boundaries
- Run the description through the checklist in Part 2 before proceeding

### Step 3 — Write the Instruction Body
Structure:
```markdown
## Overview
[One paragraph — what this skill does and when it activates, written for Claude]

## Workflow
1. [Imperative command — one clear action]
2. [Imperative command — one clear action]
...

## Output Format
[Exact spec: file type, formatting, sections, tone, length constraints]

## Edge Cases
[Explicit instruction for every known failure scenario]

## Examples
### Example 1 — Happy Path
Input: [actual example]
Output: [actual expected output]

### Example 2 — Edge Case
Input: [unusual/broken input]
Output: [how Claude should handle it]
```

Quality rules:
- Every step is a single, unambiguous action
- No vague language: "handle appropriately" → "if field is missing, output `[MISSING]` and continue"
- Instructions are imperative voice: "Read the file" not "The file should be read"
- Total length: 100–300 lines, under 500 lines hard cap

### Step 4 — Reference Files (if needed)
- Only add a `references/` folder if the skill needs a large external doc (brand guide, template library, SOP)
- Compress reference files by 50%+ — keep only actionable content
- Add a "Quick Reference" summary (under 10 lines) at the top of each reference file
- Never have a reference file link to another reference file
- Add explicit loading instructions in SKILL.md: "Before beginning, read `references/[filename].md`"

### Step 5 — Scripts (if needed)
Use scripts when the task requires computation, file manipulation, or data transformation — NOT for judgment/language tasks.

Script rules:
- One script, one job
- Accept all inputs as CLI args (no hardcoded paths)
- Print output to stdout or specified output file
- Include error handling with clear exit messages
- Comment block at top: what it does, required args, expected output, possible errors
- Python unless there's a specific reason not to

### Step 6 — QA Before Deploying
Run the QA checklist:
- [ ] `name` is valid kebab-case
- [ ] `description` is over 50 words, third-person, 5+ trigger phrases, has negative boundaries
- [ ] Every step is a single unambiguous action
- [ ] At least 2 concrete examples (happy path + edge case)
- [ ] Edge cases explicitly handled
- [ ] Output format explicitly defined
- [ ] No vague language remains
- [ ] Total length under 500 lines
- [ ] No reference file links to another reference file
- Score: if any section would score below 7/10, fix it before deploying

---

## Part 6 — State Management for Long-Running Projects

For any skill managing a multi-session project (infra migration, pipeline builds, etc.), add this pattern to the skill's workflow:

```markdown
## Session Management

At the start of every session:
1. Check for `context-log.md` in the project directory
2. If it exists, read it fully before proceeding — this is the handover from the last session
3. Summarize what was completed and what's pending before asking Dominick what to work on

At the end of every session (or when Dominick says "wrap up" or "end session"):
1. Write a `context-log.md` update with:
   - What was completed this session (with specific details)
   - What is still pending and in what state
   - Any blockers or open questions
   - Suggested starting point for next session
```

---

## Part 7 — When to Use Scripts vs. Instructions

| Use Instructions When | Use Scripts When | Use Both When |
|----------------------|-----------------|---------------|
| Task requires judgment | Task requires computation | Task needs computation AND judgment |
| Language/formatting | File manipulation | Process data → write summary |
| Decision-making | Data transformation | Parse CSV → explain anomalies |
| Drafting/rewriting | Precise calculation | Resize images → generate report |
| Categorization | External tool integration | |

---

## Part 8 — Areté Skill Candidates (Backlog)

Based on known workflows, these are high-priority skill candidates not yet built:

| Skill Name | Task | Trigger | Priority |
|-----------|------|---------|----------|
| `financial-model-qa` | Stage 1 of the financial intelligence pipeline | "QA this model", "check this Excel" | High |
| `infra-migration-tracker` | Track phase status for AWS migration | "migration status", "what phase are we on" | High |
| `outlook-classifier` | Classify and route Outlook emails | "classify this email", "route this message" | Medium |
| `session-handover` | Generic context-log pattern for any project | "wrap up", "end session", "save progress" | Medium |
| `slack-draft` | Draft Slack messages in Dominick's voice | "draft a slack", "write a message to [person]" | Low |

---

## Part 9 — Testing Protocol

Before calling any skill "production ready":

1. **Run 5 happy-path prompts** — standard requests the skill should handle perfectly
2. **Run 3 edge-case prompts** — broken, incomplete, or unusual inputs
3. **Run 2 negative prompts** — requests that should NOT trigger the skill
4. **Check for overachiever behavior** — did it add anything not asked for?
5. **Iterate** until two consecutive test runs show no failures

Use Claude's built-in Skills 2.0 eval tools (Evals, Benchmarks, A/B Comparator) for any skill that will be used by Spencer, Justino, or Sara — not just Dominick.

---

## Part 11 — CLAUDE.md: What It Is and How to Do It Right

**Sources:** Anthropic official docs, Boris Cherny (Claude Code creator), HumanLayer research, community consensus — 2025/2026

### What CLAUDE.md Actually Is

CLAUDE.md is the only file that goes into **every single Claude Code session automatically**. It's not a prompt — it's persistent memory. Claude starts every session knowing nothing about your codebase. CLAUDE.md is how you change that.

Two scopes — use both:
```
~/.claude/CLAUDE.md          ← global, applies to all projects on this machine
[project-root]/CLAUDE.md     ← project-specific, check into git
```

The global file holds your personal conventions, workflow defaults, and cross-project rules. The project file holds everything specific to that codebase — commands, architecture, gotchas, lessons learned.

### The #1 Rule: Less Is More

This is the most counterintuitive and most important thing to know.

Research on LLM instruction-following shows that frontier models can reliably follow ~150–200 instructions. Claude Code's own system prompt already consumes ~50 of those slots before your CLAUDE.md even loads. Every line you add competes with every other line. As instruction count increases, **Claude doesn't just ignore newer instructions — it starts ignoring all of them uniformly.**

Practical ceiling: **under 300 lines total, shorter is better.** HumanLayer runs their root CLAUDE.md at under 60 lines.

The test for every line: "Would removing this cause Claude to make a mistake?" If no — cut it.

If Claude keeps ignoring a rule even with `IMPORTANT:` emphasis, the file is probably too long and the rule is getting drowned out.

### What to Put In It

Three categories that belong in CLAUDE.md:

**1. WHAT — The map**
- Tech stack and versions
- Project structure and folder purposes
- Key files and what they do
- Monorepo layout if applicable

**2. HOW — The workflow**
- How to run builds, tests, and typechecks
- Git branch conventions
- Common bash commands Claude will need

**3. LESSONS — Accumulated rules**
- Mistakes Claude has made that must not repeat
- Project-specific gotchas and workarounds
- Patterns to follow and patterns to avoid

### What NOT to Put In It

- **Code style guidelines** — use a linter. Style rules bloat context and go stale fast. Use hooks or a slash command for formatting instead.
- **Task-specific instructions** — if it only applies sometimes, it doesn't belong here. Use Skills for domain-specific workflows.
- **Code snippets** — they go stale instantly. Use `file:line` references to point Claude at the real source instead.
- **Everything you might ever want Claude to know** — progressive disclosure beats upfront dumping.

### Progressive Disclosure Pattern

For larger projects, keep CLAUDE.md lean and use it as a pointer system:

```
agent_docs/
├── architecture.md        ← when Claude needs the system map
├── build-and-test.md      ← how to run things
├── code-conventions.md    ← only when writing new code
├── database-schema.md     ← only when touching data layer
└── known-gotchas.md       ← always relevant, keep short
```

In CLAUDE.md, list these files with one-line descriptions. Tell Claude to read whichever are relevant before starting. Same principle as Skills — load context on demand, not always.

### The Self-Improvement Loop (The Compounding Effect)

Every time Claude makes a mistake and you correct it, write the rule before moving on:

```
Claude makes mistake → you correct it → add rule to CLAUDE.md → done
```

Format for the Lessons section:
```markdown
## Lessons
- Do NOT [specific wrong behavior]. Instead, [correct behavior].
- Always run `npm run typecheck` after modifying TypeScript files.
- Never modify /migrations directly — use the migration CLI.
```

Over time: mistake rate drops, sessions require less steering, the system compounds. Boris Cherny's team contributes to their shared CLAUDE.md multiple times a week. Every session starts smarter than the last.

### The `tasks/` Directory Pattern

For any multi-step session, maintain two companion files:

```
tasks/
├── todo.md        ← the plan, checkable items, marked complete as you go
└── lessons.md     ← patterns captured mid-session from corrections
```

At session start: review `tasks/lessons.md`. At session end: migrate durable lessons up into CLAUDE.md.

### Session Workflow (Plan Mode Default)

Best-practice session structure from the Claude Code team:

1. **Start in Plan Mode** (`Shift+Tab` twice) — any task with 3+ steps or architectural decisions
2. **Iterate on the plan** — go back and forth until the plan is solid, before any code gets written
3. **Switch to auto-accept** — once plan is locked, let Claude execute
4. **Verify before done** — run tests, check logs, diff behavior. Never mark complete without proof it works.
5. **Capture lessons** — before closing, write corrections into CLAUDE.md or `tasks/lessons.md`

Never skip plan mode for non-trivial work. The classic failure: Claude makes 40 changes you didn't want because you let it act before agreeing on intent.

### CLAUDE.md Health Checks

- **When things go wrong** — review the file first. If a rule is being ignored, the file is too long or the rule is ambiguous.
- **Every few weeks** — ask Claude to review the file and flag redundant, conflicting, or stale instructions. Delete aggressively.
- **After adding a rule** — verify in the next session that Claude's behavior actually changed.

### Quick Checklist

- [ ] Under 300 lines total
- [ ] Every line passes the "would removing this cause a mistake?" test
- [ ] No code style rules (linter handles this)
- [ ] No code snippets (use file:line references)
- [ ] Lessons section exists and is actively updated after corrections
- [ ] Task-specific workflows live in Skills or agent_docs, not here
- [ ] Project-level file is checked into git

---

## Quick Reference — Prompts to Use

**Build a new skill:** "Use the skill-creator to help me build a skill for [task]."

**Audit existing skills:** "Run a conflict audit on my current skill library." (Paste YAML descriptions from all skills.)

**Diagnose a broken skill:** "My [skill name] skill isn't working. Here's what I typed, what I expected, and what happened. Diagnose the failure mode."

**Upgrade a description:** "My YAML description for [skill] scores weak on trigger coverage. Rewrite it to be pushier with 7+ trigger phrases and explicit negative boundaries."

---

## Part 10 — Self-Improving Skills (Living System Pattern)

**Source:** tricalt (Vasilije), "Self-Improving Skills for Agents" — March 2026

### The Core Problem
Skills degrade silently. A skill that worked last month can quietly fail when:
- The codebase changes
- The model behaves differently
- The kinds of tasks users ask for shift over time

Fixed prompt files are demos. Production systems need feedback loops.

### The Mental Shift
Stop treating skills as static instruction files. Start treating them as **living system components** — versioned, observable, and capable of self-amendment based on evidence from real execution history.

### The 5-Stage Self-Improvement Loop

```
observe → inspect → amend → evaluate → update
```

| Stage | What Happens | What to Log/Do |
|-------|-------------|---------------|
| **1. Observe** | After every skill execution, record what happened | Task attempted, skill selected, success/fail, error details, user feedback |
| **2. Inspect** | When failures accumulate, trace history around that skill | Recurring error patterns, which instruction keeps failing, tool call breakage |
| **3. Amend** | Propose a targeted patch based on evidence | Tighten trigger, add missing condition, reorder steps, fix output format |
| **4. Evaluate** | Test the amended version — did it actually improve? | Compare pass rate before/after, check for regressions |
| **5. Update** | If evaluation confirms improvement, promote to new version | Track rationale + results; if no improvement, roll back |

**Hard rule:** Never trust self-modification without evaluation. The loop is never just `observe → amend`. Always `observe → inspect → amend → evaluate`.

### How to Apply This Without Full Cognee Infrastructure

You don't need the full cognee graph stack to apply this pattern. A lightweight version for Areté:

**Observation log per skill** — add a `runs/` directory to any skill that handles critical workflows:
```
skill-name/
├── SKILL.md
├── references/
├── scripts/
└── runs/
    └── run-log.md    ← append-only log of executions
```

**What to log in `run-log.md`:**
```markdown
## [Date] — [Task summary]
- Input type: [what was passed in]
- Outcome: [success / partial / fail]
- Failure point: [which step broke, if any]
- Error: [exact error or wrong output description]
- User feedback: [if any]
- Amendment triggered: [yes/no — what was changed]
```

**When to inspect:** After 3+ failures of the same type, or after any single critical failure on a task that matters to Spencer, Justino, or Sara.

**Amendment process:**
1. Read the last 10 entries in `run-log.md`
2. Identify the recurring failure pattern
3. Propose a specific, minimal change to SKILL.md (one thing at a time)
4. State the hypothesis: "This change should fix [specific failure] because [reason]"
5. Run the testing protocol from Part 9
6. If 2 consecutive test runs pass → promote the amendment
7. If not → roll back and re-inspect

### Failure Patterns That Typically Require Amendment

| Pattern in Run Log | What It Signals | Likely Amendment |
|-------------------|----------------|-----------------|
| Same step fails repeatedly | Instruction is ambiguous or wrong | Rewrite that step with specifics |
| Wrong skill keeps getting selected | YAML description overlap | Add negative boundaries |
| Skill works on clean input, fails on real input | Edge cases underdocumented | Add edge case instructions |
| Tool call breaks after codebase change | Hard dependency on changed interface | Update script or tool reference |
| Output format keeps drifting | Output spec not specific enough | Tighten Output Format section |

### Skills That Should Have Observation Logs at Areté

Any skill used by non-technical team members (Spencer, Justino, Sara) should have a `run-log.md` from day one. Failures they experience are invisible unless logged. Priority:

- `financial-model-qa` — high stakes, complex input, first candidate for observation
- `arete-resume-reviewer` — used in hiring decisions, drift is costly
- `outlook-classifier` — email routing errors have downstream consequences
- `jd-drafter` — output quality matters externally

---

## Quick Reference — Prompts to Use

**Build a new skill:** "Use the skill-creator to help me build a skill for [task]."

**Audit existing skills:** "Run a conflict audit on my current skill library." (Paste YAML descriptions from all skills.)

**Diagnose a broken skill:** "My [skill name] skill isn't working. Here's what I typed, what I expected, and what happened. Diagnose the failure mode."

**Upgrade a description:** "My YAML description for [skill] scores weak on trigger coverage. Rewrite it to be pushier with 7+ trigger phrases and explicit negative boundaries."

**Inspect a degrading skill:** "Read the run-log for [skill name] and identify the recurring failure pattern. Propose one targeted amendment."

**Evaluate an amendment:** "I changed [specific thing] in [skill name]. Run the testing protocol and tell me if the amendment holds or should be rolled back."

---

*Last updated: March 2026*
*Sources: hoeem's Claude Skills Full Course | tricalt's Self-Improving Skills for Agents*