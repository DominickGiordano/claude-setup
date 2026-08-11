---
doc: runbook
verified: never
# watches: globs whose change invalidates this doc. See docs/architecture.md for guidance.
# For a runbook these are the OPS paths, not the source paths:
#   .github/workflows/**, docker-compose*.yml, Dockerfile*, fly.toml,
#   *.tf, Procfile, mix.exs (releases), package.json (scripts), .env.example
watches: []
---

# Runbook — [Project Name]

> How to run, deploy, and un-break this project.
> Reference with @docs/runbook.md when relevant. Not loaded every session.
> What the system *is* lives in @docs/architecture.md, not here.

**Every fact in this file must come from a real file in this repo** — a CI workflow, a
compose file, a `.tf`, an Infisical path. If you can't confirm it, write **unknown**.
A wrong deploy procedure is worse than no deploy procedure.

## Run it locally

```bash
# exact commands, in order, from a clean clone
```

Prerequisites: [runtime versions, and how they're pinned — mise / .tool-versions / asdf]

## Environments

| Env | URL | Cloud account | Branch that deploys here |
|-----|-----|---------------|--------------------------|
| dev | | | |
| prod | | | |

## Secrets

- **Source of truth**: Infisical, path `/[app-slug]/`
- **How they reach the running process**: [e.g. TF reads at plan time → AWS Secrets Manager → ECS `secrets` block → env var at runtime]
- **Local development**: [e.g. `infisical run -- mix phx.server`]
- **To add a new secret**: [the full sequence, including whether a deploy or apply is needed]

## Deploy

- **Trigger**: [push to which branch / manual approval / TFC apply]
- **What runs**: [workflow file path, and what it actually does]
- **How long**: [rough wall-clock]
- **How to tell it worked**: [health check URL, specific log line, dashboard]

## Rollback

```bash
# exact commands. Not "revert the commit" — the actual sequence.
```

**Anything that does NOT roll back cleanly** (migrations, data backfills, external state):
- [list them, or write "none known"]

## Scheduled work

| What | Schedule | Where it's defined | What breaks if it doesn't run |
|------|----------|--------------------|------------------------------|
| | | | |

## Gotchas

Things that have actually gone wrong, and what to do about them.

- [symptom → cause → fix]
