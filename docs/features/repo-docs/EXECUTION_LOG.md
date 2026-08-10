# Execution Log: Repo Docs

**Started**: 2026-08-10
**Plan**: docs/features/repo-docs/PLAN.md

---

## Phase 0 — Validate the premise (Steps 1–2)

**Gate result: PASS. Phases 2–4 are justified.**

### Step 1 — Staleness: doc age vs. churn in the paths it describes

| Repo | `architecture.md` last touched | Commits to repo since | Churn in described paths |
|---|---|---|---|
| `areteos` | 2026-04-29 | **2621** | `lib/` 3955, `test/` 2498, `priv/` 698, `config/` 126 |
| `arete-terraform-infrastructure` | 2026-03-18 | 120 | `contact-intelligence` 64, `arete-email` 45, `foundation` 33, `arilearn` 21 |
| `microsoft-entra-terraform-infrastructure` | 2026-08-10 (today) | 1 | fresh — excluded from accuracy check |
| `infisical` | 2026-04-14 | 18 | `scripts` 5, `.github` 5 — dormant repo, low signal |

### Step 2 — Accuracy: 3 concrete claims each, checked against current code

**`areteos` — 1 of 3 claims holds.**

| Claim | Reality | Verdict |
|---|---|---|
| "organized into 9 Ash domains" (Workflows, Runs, Prompts, Libraries, Projects, Accounts, Evals, Integrations, Audit) | `lib/areteos/` has ~30 domain dirs. Undocumented: `agents`, `vault`, `rag`, `memory`, `bd_pulse`, `decks`, `models`, `guardrails`, `mcp`, `tools`, `runtimes`, `taxonomy`, `workbooks`, `search`, `notifications`, `onboarding`, `grants`, `feedback`, `settings`, `storage`, `text`, `commons`, `emails`, `telemetry_domain`, `scopes`, `registry` | ❌ **FAIL** |
| "4 step executors: Agent, Tool, HITL, **Gate**" | **9** executors exist: agent, tool, hitl, extract_document, loop, wait, map, subworkflow, knowledge. **`gate_step_executor.ex` does not exist at all.** | ❌ **FAIL — and worse than incomplete: it names an executor that isn't there** |
| 6 named Oban workers | All 6 found (`eval_runner` lives in `evals/` not `workers/`, otherwise exact) | ✅ PASS |

**`arete-terraform-infrastructure` — apps claim fails.**

| Claim | Reality | Verdict |
|---|---|---|
| 3 app folders: `contact-intelligence`, `arete-intelligence-site`, `prg-deal-desk` (on hold) | **11** folders contain `.tf`: `arete-email`, `arete-intelligence-site`, `areteos`, `arilearn`, `contact-intelligence`, `foundation`, `llm-gateway`, `m365-mcp`, `prg-deal-desk`, `sextant`, `teams-bot`. **7 undocumented apps**, incl. `areteos` and `llm-gateway`. | ❌ **FAIL** |

### Verdict

The premise held, and the failure mode is worse than predicted. These docs are not merely
incomplete — `areteos/docs/architecture.md` documents a `GateStepExecutor` that does not
exist in the codebase, and `arete-terraform-infrastructure/docs/architecture.md` omits the
majority of the apps it is supposed to map, including `areteos` itself.

A confidently wrong doc is more expensive than a missing one: it gets trusted. This is
exactly the trap `arete-portfolio` already warns about for dead repos, reproduced at the
file level.

Both docs were well-written when authored. Neither was maintained. That is a maintenance
problem, not an authoring problem — so the staleness loop (Phases 2–4) is the right build,
and backfilling alone would just reset the clock on the same decay.

**One nuance worth carrying forward:** `microsoft-entra-terraform-infrastructure` was
updated today and `infisical` is dormant with 18 low-signal commits. Staleness correlates
with churn, not with time. The `watches:` globs must key off the paths that actually move,
which is what Step 6 derives from recon rather than guessing per stack.

---
## Phase 1 — Frontmatter contract + runbook template (Steps 3–5)

| File | Change |
|---|---|
| `project-template/docs/architecture.md` | Added `doc:`/`verified:`/`watches:` frontmatter with per-stack glob examples. Body sections unchanged. Added a pointer to `runbook.md` and the "write `**unknown**`, don't guess" note. |
| `project-template/docs/runbook.md` | **New.** Local run · Environments · Secrets (Infisical path + injection chain) · Deploy · Rollback (incl. "what does NOT roll back cleanly") · Scheduled work · Gotchas. |
| `project-template/.claude/CLAUDE.md` | Important Paths now lists `architecture.md`, `runbook.md`, `walkthrough/`, and explains the `watches:` mechanism. |

Not propagated to the 4 repos in `~/.claude/.projects` — every install used `--skip-projects`.

## Phase 2 — /repo-docs command (Steps 6–7)

- `global/skills/repo-docs/SKILL.md` — 5 phases: dispatch → delegated recon → derive
  `watches:` → gated outline → write. Refuses to overwrite an existing doc without
  `--refresh`; refuses to run without a `CLAUDE.md` (that's `/init`'s job).
- `global/skills/repo-docs/references/ops-recon.md` — **new**, the ops half of recon
  (CI triggers, Infisical chain, TFC state, containers, migration reversibility, health
  checks). Source-side recon **reuses** `walkthrough/references/recon.md` rather than
  duplicating its per-stack recipes.
- `global/CLAUDE.md` — added `/repo-docs` to Standard Workflow plus two rules: how it differs
  from `/walkthrough`, and the `**unknown**` requirement.

The Phase 0 findings are quoted directly in the skill body as the reason for the
no-guessing rule — the real `GateStepExecutor` and 3-of-11-apps failures.

## Phase 3 — Staleness loop (Steps 8–11)

`global/hooks/doc-staleness.js`, wired as:

| Event | Invocation | Job |
|---|---|---|
| SessionEnd | `doc-staleness.js record` | after `session-end.js` in the same chain |
| SessionStart | `doc-staleness.js surface` | new matcher-less entry; the existing `matcher: "compact"` entry is untouched |
| `/end-session` step 4 | `record` before clearing `dirty-files` | closes the one gap the hook can't see |

`global/settings.json` edited and copied to `~/.claude/settings.json` (it's copied, not
symlinked). Diffed first — no local drift. New hook + skill linked via
`install-claude-setup --force --skip-projects`.

### Two real bugs found by dogfooding, which is why Step 11 existed

**1. Deleted paths reported.** The first live run flagged `global/hooks/drift-warn.js` — a
file deleted months earlier. Cause: `dirty-files` is drained by `/end-session`, which this
user does not run reliably, so it had accumulated 189 entries across months, including paths
from other repos and the scratchpad. A signal naming files that don't exist reads as broken.
Fix: `dirty-files` entries are filtered to paths that still exist.

**2. A doc written today was immediately flagged as stale.** Cause: `dirty-files` has no time
bound whatsoever, so ancient edits to still-existing files counted against a brand-new doc.

Fix — the actual semantic correction: **every source is now bounded by the doc's own
`verified:` date**, not by session bookkeeping.

- `git log --since=<verified+1d>` — committed history since the doc was confirmed. This is the
  correct question, it self-bounds, and it means the hook works on a **fresh clone with no
  session history at all** — which matters, because the other 12 Tier-1 repos have none.
  Deliberately includes deletions: "the doc still describes something that's gone" is the
  most valuable flag available.
- `git diff` / `git diff --cached` — uncommitted work, filtered by mtime ≥ cutoff.
- `dirty-files` — same mtime filter, plus the existence filter.

Cutoff is **the day after** `verified:`, not the day itself: writing a doc at 18:00 from files
edited at 10:00 the same morning must not flag it. Cost is a change later on the verification
day gets missed — the right trade, since under-flagging is recoverable and noise is not.
`verified: never` has no baseline, so the history window is skipped entirely.

### Verification

`tests/test-doc-staleness.js` — **72 cases, all passing.** Self-contained (builds throwaway
git fixtures in a temp dir, takes no arguments). Covers: 25 glob cases incl. regex-metachar
escaping and the `a/**/b` → `a/b` zero-directory case; 8 frontmatter cases incl. malformed and
unterminated YAML; the existence and mtime filters; the `--since` window in both directions
plus a deletion; `verified: never`; merge with prior entries; self-edit exclusion; memory-dir
exclusion; `reason=clear`/`resume` skips; surface self-heal on refresh and on doc deletion;
and fail-open on garbage stdin, absent `dirty-files`, absent `.claude/`, and malformed globs.

Live, in this repo:

| Check | Result |
|---|---|
| Docs written today flagged? | ✓ no false positive |
| Positive control (`touch -t 202609011200 bin/claude-setup`) | ✓ flagged both docs |
| Self-heal after `verified:` bump | ✓ entry dropped |

`.claude/memory/stale-docs` needs no gitignore entry — `.claude/memory/` is already ignored.

**Not yet verified:** whether Claude Code actually injects `additionalContext` from a
matcher-less SessionStart hook. The hook emits the documented JSON shape and the tests assert
it, but confirming the harness consumes it requires a fresh session. If it turns out not to
surface, the fallback is the Phase 4 commit gate.

## Phase 5 (partial) — claude-setup's own docs

`docs/architecture.md` and `docs/runbook.md` written for this repo (Tier 1, Step 18) as the
dogfood target. Notable content: the link-vs-copy split table (the `settings.json`-is-copied
trap), the per-file-symlink reason a new hook needs `--force`, and the fact that this repo has
**no CI at all** — verified, no `.github/` here — so "deploy" means the symlinks already point
at your worktree.

