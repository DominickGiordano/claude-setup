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
| `areteos-py` | **The Python re-base of `areteos`** — same platform (agent runtime, durable workflows, human approval, vault, audit) rebuilt on the Python AI ecosystem, plus a React app for non-technical users. Migration in flight; both repos active. | Python, FastAPI, pydantic, Anthropic SDK |
| `bd-pulse` | **BD Pulse** — internal CRM. Team BCCs/forwards to `bd@aretecp.com`; Claude classifies BD relevance, tracks activity per person, powers a weighted leaderboard. Email body processed then discarded, metadata only. | Node, Python, FastAPI |
| `beacon` | Cross-app error/report triage service. First-party apps POST reports to one authenticated ingest endpoint; Beacon dedupes, AI-triages, humanises. "Phase 1 of the Areté Issue Hub arc." | Node |
| `arilearn-phx` | Phoenix 1.8 + Ash app, Tailwind v4 + daisyUI, `mise` for runtimes. Strict conventions — read [Resolved](#resolved) before touching it. Product purpose still **unknown**. | Elixir, Phoenix, Ash, Oban, LiveView |
| `Project-Tahoe` | Shared data lake + gateway aggregating external market intelligence (PitchBook, DebtWire, EDGAR, exa.ai, news) plus internal operational data. | Python, FastAPI |
| `arete-terraform-infrastructure` | Terraform IaC for all AWS resources across `arete-dev` (252624323389) and `arete-prod` (059393269593) via Terraform Cloud. Folder-per-app, each its own TFC workspace pair; apps read foundation outputs via `terraform_remote_state`. | Terraform |
| `microsoft-entra-terraform-infrastructure` | Entra ID (Azure AD) app registrations. One `<app>.tf` per app calling `module.app_registration` + `module.infisical_entra_secrets`. Secrets push to Infisical at `/{app-slug}/` post-apply. | Terraform |
| `github-actions` | Reusable composite actions and workflows for `aretecp` repos. Drop-in `uses:` references with org defaults baked in. | — |
| `arete-claude-plugins` | Claude Code **plugin marketplace** for Areté. Each plugin under `plugins/` bundles related skills for a team or workflow. Not a duplicate of this repo — see [Plugin marketplaces](#plugin-marketplaces). | — |
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
  still use the original `bd-tracker` codename; the product name is **BD Pulse**. The repo is
  `bd-pulse`; a bare `~/dev/arete/bd-tracker` path is a stray venv, not the code.
  (`~/.claude/.projects` was corrected to point at `bd-pulse` on 2026-08-05.)
- `bd-tracker-frontend-v0` is archived (Mar 2026). Not the current frontend.
- **`areteos-py` is the Python re-base of `areteos`**, not a separate product. Both active during the migration — a change may belong in both.
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

## Plugin marketplaces

`arete-claude-plugins` is **not** a duplicate of `claude-setup` — different audiences:

| | `claude-setup` | `arete-claude-plugins` |
|---|---|---|
| Audience | Dominick's engineering config | The firm — incl. non-engineers |
| Delivery | Symlinks into `~/.claude` | `arete-marketplace` via `/plugin`, plus zips uploaded to `claude.ai/admin-settings/skills` for chat/Excel/PowerPoint |
| Owner | Dominick | Spencer Lyon (`slyon@aretecp.com`) |
| Contents | dev workflow, language skills, hooks, rules | `arete-core` (brand, pptx, AI-idea intake, company research), `arete-recruiting` (resume review, JD drafting), `arete-dev` (infisical, self-hosted runners, context7 MCP), `credit-agreement-reviewer`, `jcl-cadence` |

Two things follow from that:

1. **`arete-marketplace` is not installed on this machine.** Known marketplaces are
   `claude-plugins-official`, `sglyon-marketplace`, `compound-engineering-plugin`,
   `sglyon-claude-plugins`. So none of `arete-core`'s firm-wide skills are available here:
   `claude plugin marketplace add aretecp/arete-claude-plugins`.
2. **`infisical` exists in both** and has diverged — 103 lines here, 154 in `arete-dev`. Two
   sources of truth for the same conventions. One should win; the plugin copy reaches the whole
   firm, this copy reaches only this machine.

The `/ce:*` commands Garrett's original workflow referenced come from the
**compound-engineering** plugin, installed at *project* scope in `arilearn` and `arilearn-phx`
only. That is why `/cycle` had to be rewired — those commands don't exist in most repos. Our
version chains our own `/brainstorm` and `/plan`, so it works everywhere.

## Resolved

Answers found by reading the repos, 2026-08-05:

- **`areteos-py` is the Python re-base of `areteos`**, in its own words: "the Python re-base of
  Areté's original Elixir/Ash application," keeping AreteOS tenancy, authorization, vault,
  approval, budget, audit and durability guarantees around a Python execution core. Started
  2026-06-23; `areteos` started 2026-02-16. Both active because the migration is in flight —
  when touching either, check whether the change belongs in both.
- **`Sextant` is a product, not a repo.** "See where AI can create value" — AI-readiness
  assessment (surveys, interviews, document analysis → readiness profile + prioritized
  roadmap), powering the *Discover* phase. Described in `ari-website/src/data/products.ts`;
  `sextant-designs-j` holds designs. No application repo exists locally, though Beacon lists
  `sextant` as a report source — so either it lives elsewhere or that integration is planned.
- **`contact-intelligence` is paused, not finished.** Last activity 2026-05-19 was a run of
  OAuth/MSAL iframe bug fixes (PRs #72, #74) — it stopped mid-remediation rather than at a
  finish line.
- **`arilearn-phx`'s conventions are strict and worth reading before touching it** (from its
  `AGENTS.md`): `mix precommit` must exit 0 before every push and does *not* run tests — CI owns
  the full suite via `mix precommit.full`; persisted entities **must** be Ash resources with
  `AshPostgres.DataLayer` (raw `Ecto.Schema` is remediation scope under #993, not precedent);
  `Req` for HTTP, never HTTPoison/Tesla/httpc; `docs/solutions/` is grep-searchable by YAML
  frontmatter. Its **product purpose is still unknown** — the docs are all conventions.

## Still open

1. **`arilearn-phx` — what the product actually does and who uses it.** Not in any doc.
2. **The duplicated `infisical` skill** (see above) needs one owner.
3. Whether `claude-setup` should publish into `arete-marketplace` rather than stay
   symlink-only — the "Phase 5" question, now with the marketplace already existing.

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
