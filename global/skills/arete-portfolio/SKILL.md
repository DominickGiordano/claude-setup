---
name: arete-portfolio
description: >-
  Map of Areté's 44 repos — which apps are live vs archived, what each one is, how they
  connect (Beacon ingest, Project Tahoe data lake, Infisical secrets, shared GitHub Actions),
  and which repo supersedes which.
when_to_use: >-
  Before planning anything cross-app, before building something that may already exist, when
  a repo name is unfamiliar, or when asked how our apps fit together. Triggers: which app,
  what is areteos, bd-pulse, BD Pulse, bd-tracker, beacon, orbit, Project Tahoe, arilearn,
  contact intelligence, sextant, our apps, portfolio, does this already exist, superseded,
  archived repo, cross-app, integration.
allowed-tools: Read, Grep, Glob, Bash(node ${CLAUDE_SKILL_DIR}/scripts/derive.js *)
---

# Areté portfolio

**Verified:** 2026-08-05 against `~/dev/arete` (44 repos).
Descriptions below are quoted or summarised from each repo's own `README.md` / `CLAUDE.md` —
not inferred. Anything unverified is marked **unknown**, not guessed.

Derived facts (stack, activity, branch topology, compose services, Project Config coverage)
live in `references/inventory.md` and are **generated** — see [Refreshing](#refreshing).

## Read this first

- **44 repos. 13 active, 10 dormant, 21 archived** (≥120 days without a commit).
- Before building anything, check the archived list. Several dead repos have an active
  successor in the same family, and the dead one is still a plausible-looking destination.
- Four repos carry almost all the volume: `areteos` (2284 commits/90d), `arilearn-phx` (1742),
  `bd-pulse` (1558), `areteos-py` (1139).

## The active apps

| Repo | What it is | Stack |
|---|---|---|
| `areteos` | The internal AI workflow / agent platform. Phoenix/Ash app running LLM-driven multi-step DAGs (agent / human-in-the-loop / tool steps) for BD and operations. Credential vault, library RAG, MCP integrations, run history, LLM observability (Logfire + Langfuse). Also open-source as "Durable AI Workflows". | Elixir, Phoenix, Ash, Oban, Jido, ReqLLM, LiveView |
| `areteos-py` | "Multi-tenant platform for creating, running, and governing AI agents and workflows — agent runtime, durable workflow execution." Overlaps `areteos` in stated purpose — see [Open questions](#open-questions). | Python, FastAPI, pydantic, Anthropic SDK |
| `bd-pulse` | **BD Pulse** — internal CRM. Team BCCs/forwards to `bd@aretecp.com`; Claude classifies BD relevance, tracks activity per person, powers a weighted leaderboard. Email body processed then discarded, metadata only. | Node, Python, FastAPI |
| `beacon` | Cross-app error/report triage service. First-party apps POST reports to one authenticated ingest endpoint; Beacon dedupes, AI-triages, humanises. "Phase 1 of the Areté Issue Hub arc." | Node |
| `arilearn-phx` | Phoenix 1.8 + Ash app, Tailwind v4 + daisyUI. Uses `mise` for runtime versions. Purpose beyond "learning platform" — **unknown**, fill in. | Elixir, Phoenix, Ash, Oban, LiveView |
| `Project-Tahoe` | Shared data lake + gateway aggregating external market intelligence (PitchBook, DebtWire, EDGAR, exa.ai, news) plus internal operational data. | Python, FastAPI |
| `arete-terraform-infrastructure` | Terraform IaC for all AWS resources across `arete-dev` (252624323389) and `arete-prod` (059393269593) via Terraform Cloud. Folder-per-app, each its own TFC workspace pair; apps read foundation outputs via `terraform_remote_state`. | Terraform |
| `microsoft-entra-terraform-infrastructure` | Entra ID (Azure AD) app registrations. One `<app>.tf` per app calling `module.app_registration` + `module.infisical_entra_secrets`. Secrets push to Infisical at `/{app-slug}/` post-apply. | Terraform |
| `github-actions` | Reusable composite actions and workflows for `aretecp` repos. Drop-in `uses:` references with org defaults baked in. | — |
| `arete-claude-plugins` | Claude Code **plugin marketplace** for Areté. Each plugin under `plugins/` bundles related skills for a team or workflow. See [Open questions](#open-questions). | — |
| `claude-setup` | This config. Source of truth for `~/.claude/` — symlinked, so edits are live. | Bash, Node |
| `website` | Corporate site for Areté Partners. Astro on Cloudflare Workers, content as MDX/JSON in-repo, no CMS. Built to be edited with coding agents. | Astro, Tailwind |
| `ari-website` | Astro landing page for Areté **Intelligence** (the data/AI team). Component-based, Tailwind v4. | Astro, Tailwind |

## How they connect

Verified from the repos' own docs:

```
                    ┌─ bd-pulse ──┐
  error / user      ├─ areteos ───┤
  reports  ────────▶├─ arilearn ──┼──▶ beacon  (single authenticated ingest,
                    └─ sextant ───┘            dedupe → AI triage → humanise)

  PitchBook, DebtWire, EDGAR,
  exa.ai, news, internal ops ──▶ Project-Tahoe  (shared data lake + gateway)

  microsoft-entra-terraform ──▶ Infisical  (secrets pushed to /{app-slug}/ post-apply)

  arete-terraform-infrastructure ──▶ AWS arete-dev / arete-prod  (via Terraform Cloud;
                                     apps read foundation outputs, no shared app state)

  github-actions ──▶ every aretecp repo  (reusable composite actions)
```

**Orbit** is planned, not built: a stakeholder-facing intake/ticketing app, sister to Beacon
and Phase 2 of the Issue Hub arc. Beacon stays the dev-facing tracker; Orbit is the request
intake with visibility, estimates and per-user queues. If asked to build it, it does not exist
yet — check `beacon` first for what to reuse (demand/upvote and watch already exist there).

## Naming traps

- **`bd-tracker` and BD Pulse are the same thing.** The repo, containers and deployed infra
  still use the original `bd-tracker` codename; the product name is **BD Pulse**. A
  `bd-tracker` entry in `~/.claude/.projects` points at a directory that is not the repo —
  the real one is `bd-pulse`.
- `bd-tracker-frontend-v0` is archived (Mar 2026). Not the current frontend.
- **`areteos` ≠ `areteos-py`.** Both active, similar stated purpose, different stacks.
- Areté **Partners** is the firm (`website`); Areté **Intelligence** is the data/AI team
  (`ari-website`, and the `ari-*` family).

## Archived — check before building on these

21 repos have no commits in 120+ days. The ones with an active successor:

| Archived | Superseded by |
|---|---|
| `arilearn` (Python) | `arilearn-phx` (Elixir/Phoenix) |
| `bd-tracker-frontend-v0` | `bd-pulse` |
| `claude-skills`, `claude-marketplace`, `claude-plugin-arete` | `claude-setup` + `arete-claude-plugins` |
| `codex-setup` | `claude-setup` |
| `arete-website-wordpress`, `areteintelligence-site` | `website`, `ari-website` |
| `clerk-*`, `terraform-provider-clerk` | Clerk work appears abandoned — confirm before reviving |
| `debtwire-mcp`, `bdc-edgar` | Those feeds now land via `Project-Tahoe` |

Full list with dates in `references/inventory.md`.

## Open questions

Flagged rather than guessed. Resolve these and update this file's `Verified:` date.

1. **`arete-claude-plugins` overlaps this repo.** It is an active Claude Code plugin
   marketplace; `claude-setup` deferred plugin packaging as "Phase 5". Two answers are
   possible — the marketplace is where `claude-setup` should eventually publish, or the two
   have diverged and one should win. Decide before doing more plugin work.
2. **`areteos` vs `areteos-py`.** Both active and both describe an agent/workflow platform.
   Is the Python one a rewrite, a service alongside, or a parallel effort?
3. **`arilearn-phx`'s purpose.** Its README covers stack and setup but not what the product
   does or who uses it.
4. **`contact-intelligence` + `contact-intelligence-services`** are dormant (May 2026) with a
   `develop` branch and Project Config. Paused or finished?
5. **`sextant`** is named by Beacon as a first-party app; only `sextant-designs-j` (dormant,
   designs) exists locally. Where does the app live?

## Refreshing

Derived facts go stale silently; curated prose above goes stale visibly via `Verified:`.

```bash
node ~/.claude/skills/arete-portfolio/scripts/derive.js > \
  ~/dev/arete/claude-setup/global/skills/arete-portfolio/references/inventory.md
```

Read-only — it never writes to the scanned repos. `--json` for machine-readable output,
`--root <dir>` to scan elsewhere.

Re-verify the curated half when: a repo appears or disappears, an app changes stack, an
integration edge changes, or a repo crosses into `archived`. If you learn something about an
app while working in it, update its row here — that is the whole point of the file.
