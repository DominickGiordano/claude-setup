---
name: infisical
description: >
  ALWAYS use when working with Infisical or secrets management — CLI usage, SDK
  integration, injecting secrets into services, post-Terraform-apply secret push,
  or setting up new project secret environments. Also triggers for: secret rotation,
  secret paths, or any mention of Infisical in infrastructure work.
  Trigger phrases: "infisical", "secrets", "secret management", "secret push",
  "secret rotation", "vault", "credentials management".
---

# Infisical Patterns — Areté

## CLI — Daily Use
```bash
# Authenticate (one time per machine)
infisical login

# Run a command with secrets injected as env vars
infisical run --env=dev -- npm run dev
infisical run --env=prod -- node dist/server.js

# Export secrets to a .env file (dev only — never commit)
infisical export --env=dev --format=dotenv > .env.local

# View secrets for an environment
infisical secrets --env=dev

# Set a secret
infisical secrets set MY_KEY="my-value" --env=dev
```

## Node.js SDK
```ts
import { InfisicalClient } from "@infisical/sdk";

const client = new InfisicalClient({
  clientId: process.env.INFISICAL_CLIENT_ID!,
  clientSecret: process.env.INFISICAL_CLIENT_SECRET!,
});

// Fetch a single secret
const secret = await client.getSecret({
  secretName: "ANTHROPIC_API_KEY",
  projectId: process.env.INFISICAL_PROJECT_ID!,
  environment: process.env.NODE_ENV === "production" ? "prod" : "dev",
  path: "/",
});

const apiKey = secret.secretValue;
```

## Python SDK
```python
from infisical_sdk import InfisicalClient

client = InfisicalClient(
    client_id=os.environ["INFISICAL_CLIENT_ID"],
    client_secret=os.environ["INFISICAL_CLIENT_SECRET"],
)

secret = client.getSecret(
    secret_name="ANTHROPIC_API_KEY",
    project_id=os.environ["INFISICAL_PROJECT_ID"],
    environment="prod",
    path="/",
)

api_key = secret.secret_value
```

## Elixir — via CLI injection
```elixir
# In mix.exs or a release script, use infisical run:
# infisical run --env=prod -- mix phx.server

# Access via System.fetch_env! at runtime
anthropic_key = System.fetch_env!("ANTHROPIC_API_KEY")
```

## Terraform — via environment injection
```bash
# Inject Infisical secrets before terraform commands
infisical run --env=prod -- terraform apply
```

## Project Setup Checklist
```
[ ] Create project in Infisical dashboard
[ ] Set up environments: dev, staging, prod
[ ] Add INFISICAL_PROJECT_ID to each dev's local .env (non-secret, safe to share)
[ ] Add INFISICAL_CLIENT_ID + INFISICAL_CLIENT_SECRET to CI/CD as masked vars
[ ] Add infisical run to dev scripts in package.json / Makefile
[ ] Document which secrets live in Infisical in project CLAUDE.md
```

## Rules
- **Never commit secrets** — `.env`, `.env.local`, `.env.*` always in `.gitignore`
- **Never hardcode secrets** in code, even temporarily
- Use machine identities (client ID + secret) for CI/CD — not personal tokens
- Rotate secrets on: team member offboarding, suspected exposure, quarterly
- Prod secrets accessible only to prod machine identity + authorized humans
- Dev secrets can be looser — but still via Infisical, not committed files
