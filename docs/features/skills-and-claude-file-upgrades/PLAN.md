# Plan: Skills & CLAUDE.md Upgrades

**Status**: Draft
**Source**: `docs/spikes/skills-and-claude-file-upgrades.md` + `docs/spikes/session-analysis-and-process-gaps.md`
**Owner**: Dominick
**Created**: 2026-03-13

---

## Context

The spike doc (`skills-and-claude-file-upgrades.md`) is based on hoeem's Claude Skills course and tricalt's self-improving skills pattern. It's written for **Claude Projects** (SKILL.md files, YAML frontmatter, auto-activation by description matching). Our setup uses **Claude Code** (agents with model/subagent_type frontmatter, commands with skill frontmatter, reference skills as passive docs).

This plan extracts what's transferable and merges it with the process gaps from the session analysis spike.

---

## What Transfers Directly

| Spike Concept | Our Equivalent | Action |
|---------------|----------------|--------|
| Pushy YAML descriptions with trigger phrases | Agent/command `description` fields in frontmatter | Audit and improve all 10 agents + 18 commands |
| Negative boundaries ("don't fire when...") | Agent descriptions lack these entirely | Add exclusion rules to overlapping agents |
| Failure modes (Silent, Hijacker, Drifter, Fragile, Overachiever) | Universal — applies to our agents/commands | Add as diagnostic reference |
| CLAUDE.md best practices (Part 11) | Already mostly followed, but template can improve | Update project template |
| Self-improvement loop (observe → inspect → amend → evaluate) | `/compound` captures patterns, but no observation loop | Integrate run-logging into compound workflow |
| New skill build sequence | `meta-agent` exists but has no formal process | Codify the build checklist into meta-agent |

## What Doesn't Transfer

| Spike Concept | Why Not |
|---------------|---------|
| SKILL.md file format | We use agents (.md with model/subagent_type) and commands (.md with skill frontmatter) |
| `references/` and `scripts/` subdirs per skill | Our skills are flat .md files — reference docs, not executable skills |
| YAML description as activation trigger | Claude Code uses command names (/fix, /plan) and agent subagent_type, not description matching |
| Skills 2.0 eval tools (Evals, Benchmarks, A/B Comparator) | Claude Projects feature, not available in Claude Code |
| `runs/` directory per skill | Overkill for our setup — compound pattern is lighter |

---

## Plan

### Phase 1: CLAUDE.md Improvements

**1.1 — Audit global CLAUDE.md against Part 11 guidelines**
- Current: 63 lines. Already lean. Passes the "under 300 lines" check easily.
- Gap: No `## Lessons` section for accumulated rules.
- Gap: No progressive disclosure pointers to `docs/` resources.
- Action: Add a `## Lessons` section (start empty, grows over time). Add a `## Reference Docs` section pointing to workflow docs and this plan.

**1.2 — Improve project template CLAUDE.md**
- Current: Good structure but generic.
- Gap: No `## Lessons` section template.
- Gap: No first-session checklist.
- Action: Add `## Lessons` stub. Add a comment block at top with first-session checklist: "Fill in What This Is, Stack, Key Commands, Important Files, then delete this checklist."

**1.3 — Create CLAUDE.md health check command**
- The spike recommends periodic review. We can automate this.
- New command: `/audit-claude-md` — reads the project CLAUDE.md, checks line count, flags stale/redundant rules, checks for missing sections.
- Low effort, high compound value.

### Phase 2: Agent & Command Description Upgrades

**2.1 — Audit all agent descriptions for trigger coverage**

The spike's "pushy description" concept translates directly: if an agent's description is weak, the main Claude instance won't delegate to it effectively. Each agent description should:
- State exactly what it does (third person, specific)
- List when to use it (trigger conditions, not phrases — since we don't auto-activate)
- State when NOT to use it (negative boundaries)
- Be over 50 words

Agents to audit (10):
- [ ] brainstorm — check: does it exclude cases where approach is already decided?
- [ ] planner — check: does it exclude tiny tasks?
- [ ] orchestrator — check: does it specify "only for epics/multi-feature"?
- [ ] executor — check: does it mention the Draft→Ready gate?
- [ ] researcher — check: does it clarify when to research vs just brainstorm?
- [ ] code-reviewer — check: does it specify what languages/patterns it checks?
- [ ] compounder — check: does it clarify pattern vs one-off fix?
- [ ] debugger — check: does it exclude "code doesn't work" (that's /fix) from "something is broken in production"?
- [ ] memory-updater — check: adequate, it's only called by /end-session
- [ ] meta-agent — check: adequate, rarely used directly

**2.2 — Audit all command descriptions**

Same principles. Commands (18) use `description` in frontmatter to help Claude decide when to suggest them. Focus on the most-used commands first:
- [ ] /fix, /brainstorm, /plan, /execute — core workflow
- [ ] /commit, /review, /test — code quality
- [ ] /end-session, /catchup, /sync-memory — memory
- [ ] /compound, /status — knowledge
- [ ] /research, /orchestrate, /pr, /setup — less frequent

**2.3 — Collision test between similar agents/commands**

Pairs that could collide:
- `/fix` vs `/execute` — both "do the thing." Fix = small/no plan. Execute = follows a plan doc.
- `/brainstorm` vs `/research` — both "explore before building." Research = external tech. Brainstorm = solution design.
- `/catchup` vs `/sync-memory` — both "restore context." Catchup = read session-log. Sync-memory = backfill from git.
- `debugger` vs `/fix` — both "something's broken." Debugger = diagnosis. Fix = diagnosis + implementation.

Action: Add explicit negative boundaries to each to prevent confusion.

### Phase 3: Formalize the Build Process

**3.1 — Upgrade meta-agent with build checklist**

The spike's "New Skill Build Sequence" (Part 5) is good process. Adapt for our system:

1. **Define the job** — What does this agent/command do? When should it activate? What does "good" look like?
2. **Write the frontmatter** — Pushy description, correct model selection, proper type
3. **Write the instruction body** — Overview, workflow steps, output format, edge cases
4. **Collision check** — Does this overlap with any existing agent/command? Add negative boundaries.
5. **QA** — Test with 3 happy-path prompts, 2 edge cases, 1 negative (shouldn't trigger)

Action: Update `global/agents/meta-agent.md` to include this checklist as mandatory steps.

**3.2 — Add failure mode diagnostic to debugger**

The spike's 5 failure modes (Silent, Hijacker, Drifter, Fragile, Overachiever) are useful for diagnosing agent/command issues. Add these as a reference section in the debugger agent or create a `docs/solutions/agents/failure-modes.md` compound doc.

### Phase 4: Self-Improvement Loop (Lightweight)

**4.1 — Integrate observation into /compound**

The spike proposes a full `runs/` directory with run-logs per skill. That's too heavy for us. Instead, enhance `/compound` to be the observation → amendment pathway:

Current flow: Notice pattern → `/compound` → writes solution doc
Enhanced flow: Notice pattern → `/compound` → writes solution doc → if pattern is about an agent/command failure, also proposes an amendment to the agent/command itself

This means `/compound` should:
- Check if the pattern relates to a skill/agent/command
- If yes, propose a targeted edit to the relevant file
- Log the amendment rationale in the solution doc

**4.2 — Add periodic audit prompt**

Create a command `/audit-skills` that runs the adapted version of the spike's audit protocol:
1. Territory map — list all agents/commands with one-line purpose
2. Collision test — flag overlapping descriptions
3. Dead zone check — what common tasks don't map to any command?
4. Review recent session-log for patterns that should be commands but aren't

Run monthly or when the system feels "off."

### Phase 5: Skill Candidate Triage

From both spikes, these are the proposed new skills/agents. Prioritized by actual usage:

**Build now (active projects need these):**
- [ ] Update `python.md` — add FastAPI, pydantic v2, httpx, aiosqlite (2 active projects)
- [ ] Update `anthropic-api.md` — add Python SDK patterns (bd-tracker uses it)
- [ ] Add `microsoft-graph.md` — Graph API auth, mail, webhooks, permissions (2 active projects)

**Build soon (recurring patterns):**
- [ ] Add `docker-deploy.md` — Compose + Traefik + blue-green (3 projects share this)
- [ ] Add `clerk-auth.md` — JWT validation, Terraform resources (3 projects)
- [ ] Update `testing.md` — add pytest-asyncio, FastAPI TestClient

**Skip for now:**
- `financial-model-qa` — no active project yet
- `infra-migration-tracker` — AWS migration not started
- `outlook-classifier` — bd-tracker handles this in code, not as a skill
- `session-handover` — /end-session already does this
- `slack-draft` — low value, Slack messages are short enough to write manually

---

## Execution Order

1. Phase 1 (CLAUDE.md) — small, immediate value, no risk
2. Phase 2 (descriptions) — medium effort, high compound value
3. Phase 5 (skill updates) — unblocks active project work
4. Phase 3 (build process) — codifies what we learn in phases 1-2
5. Phase 4 (self-improvement) — builds on everything above

---

## Success Criteria

- Global CLAUDE.md has a Lessons section that gets entries within 2 weeks
- Agent descriptions all pass the 50-word, negative-boundary check
- No command collision ambiguity (each command has clear "use this, not that" guidance)
- `python.md` and `anthropic-api.md` updated to cover active project patterns
- `microsoft-graph.md` skill exists and is referenced by bd-tracker and outlook projects
- meta-agent includes the build checklist
- `/compound` can propose agent/command amendments when relevant

---

## Open Questions

- [ ] Should `/audit-skills` be a command or just a prompt we run manually?
- [ ] How aggressive should we be pruning unused skills (Next.js, Prisma)? They're not hurting anything but add to inventory.
- [ ] The spike mentions "Skills 2.0 eval tools" — are these available in Claude Code yet? If so, we should integrate them into QA.
