---
name: cycle
description: "Run the full loop in one session — brainstorm, plan, goal file with issues, then execute to open PRs. Four human gates."
disable-model-invocation: true
argument-hint: "<the problem or feature, in a sentence or two>"
---

# /cycle — Brainstorm → Plan → Goals → Execute

Drive the whole loop for: **$ARGUMENTS**

Adapted from Garrett's `gw:cycle`. His version reads `~/.claude/commands/ce/…` and `gw/…`,
which don't exist in this setup — we use `~/.claude/skills/<name>/SKILL.md`. Paths below are
corrected, and the stages map onto our own `/brainstorm` and `/plan`.

## Why this reads files instead of invoking commands

Our workflow commands all set `disable-model-invocation: true`, so Claude cannot invoke them
through the Skill tool — only you can type them. Reading each stage's `SKILL.md` and following
its body is therefore the only way to chain them, not a workaround.

| Stage | Instruction file |
| ----- | ---------------- |
| 1. Brainstorm | `.claude/skills/brainstorm/SKILL.md`, else `~/.claude/skills/brainstorm/SKILL.md` |
| 2. Plan | `.claude/skills/plan/SKILL.md`, else `~/.claude/skills/plan/SKILL.md` |
| 3. Goals | `.claude/skills/goals/SKILL.md`, else `~/.claude/skills/goals/SKILL.md` |
| 4. Execute | `.claude/skills/goal/SKILL.md`, else `~/.claude/skills/goal/SKILL.md` |

Resolve project-level before user-level. Read the file, treat its body as your instructions for
that stage, and substitute `$ARGUMENTS` as that stage's input. If a file is missing, **stop and
name the path** — don't approximate a command you can't read.

Note `/brainstorm` and `/plan` have their own pre-flight steps (checking for prior RESEARCH.md,
refusing to overwrite an `In Progress` plan without `--force`). Honor them.

## The four stages

### Stage 1 — Brainstorm

Follow `brainstorm/SKILL.md` with `$ARGUMENTS` as input. Output:
`docs/features/<topic>/BRAINSTORM.md`.

**Interactive by design.** Ask the questions it asks and wait for real answers. Do not answer
on the user's behalf, and do not shortcut to a recommendation because three stages remain.

**Gate 1:** summarize the direction in five bullets or fewer, then ask:
`Ready to plan this? (yes / keep brainstorming / adjust: …)`

Do not proceed on silence or ambiguity.

If the approach is already decided, the user can skip this stage — say so and go to Stage 2.
Consider `/research <topic>` first if the tech is unfamiliar; it runs in a forked researcher
with web access and writes `RESEARCH.md`, which `/brainstorm` then picks up.

### Stage 2 — Plan

Follow `plan/SKILL.md`, using the brainstorm output as input. Output:
`docs/features/<feature>/PLAN.md`.

**Gate 2:** present the plan and ask:
`Approve this plan? (yes / revise: …)`

If the user revises, re-run this stage. Plan revisions are cheap; issue churn is not.

Set the plan's status to `Ready` once approved — Stage 3 refuses a `Draft` plan, by design.

### Stage 3 — Goals

Follow `goals/SKILL.md` against the approved plan. Output:
`docs/features/<feature>/GOALS.md`, a tracking issue, and task issues.

That command has **its own confirmation** before creating issues — honor it. Gate 2 is not
blanket approval to create issues. Present the phase/task/issue-count summary and get a
separate yes.

**Gate 3:** ask:
`Start executing? (all tasks / first task only / stop here — I'll run /goal later)`

`stop here` is a normal, good answer. A goal file with issues is a complete deliverable.

### Stage 4 — Execute

Follow `goal/SKILL.md` against the goal file from Stage 3.

- `all tasks` → loop until done or blocked
- `first task only` → one task, then stop and report

Honor it exactly: tests first and failing, full suite green using the **resolved
`test_commands`** (never assume `pytest`), docs updated, work log to **auto memory not
CLAUDE.md**, commit with `Closes #n`, one PR per task into `base_branch`, CI watched to green,
goal file ticked, `/context` check after each task with `/compact` at ≥70%.

**Never merge.** Stage 4 ends at green CI on open PRs. Merging is the user's.

## Context budget across stages

Four stages in one session makes context the binding constraint.

- Check `/context` at every gate, not just inside Stage 4.
- **At ≥60% at any gate:** confirm the current stage's artifact is on disk, then `/compact`
  keeping the artifact paths, then re-read and continue.
- Stage 3 is the natural checkpoint. Once `GOALS.md` exists on disk, everything before it is
  disposable — compact aggressively there.
- At ≥85% mid-task in Stage 4: finish the current task's disk writes, compact, re-read the goal
  file before touching the next task.

Every stage writes its artifact to `docs/features/<feature>/`, so a compact never loses work
that reached disk.

## Resuming

If `$ARGUMENTS` names an existing goal file, or the user says "resume", skip to Stage 4 — don't
re-brainstorm work that's already planned.

## Guardrails

- **Four gates, four real answers.** Never chain past a gate on your own judgment. The point is
  speed between stages, not removing the human from them.
- Write no implementation code before Stage 4.
- Stage 2's plan must carry the numbered decomposition from `rules/pr-sizing.md`, and
  Stage 3 must make each issue one reviewable piece. `/cycle` reads files instead of
  invoking the commands, so these do not come along for free.
- Create no GitHub issues before Stage 3's own confirmation.
- If a stage's file is missing, stop and name the path.
- If an answer at any gate changes the shape of the work, go back a stage rather than patching
  forward.
