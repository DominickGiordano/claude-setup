---
name: docker-deploy
description: >-
  Areté conventions for Docker Compose, Traefik and container deploys: Dockerfiles,
  multi-stage builds, reverse proxy config, SSL, health checks, container networking.
when_to_use: >-
  Writing Docker or deployment config for any Areté service. Triggers: docker, compose,
  traefik, container, dockerfile, deploy, reverse proxy, SSL, health check,
  docker-compose.yml.
---

# Docker Compose + Traefik Deployment — Areté Patterns

## References

Load only what the task needs — these do not enter context until you read them:

| File | Read when |
|---|---|
| `references/compose.md` | Writing or changing a docker-compose service definition |
| `references/traefik.md` | Configuring Traefik — static config, middleware, router labels, TLS |
| `references/dockerfiles.md` | Writing a Dockerfile, a multi-stage build, SPA runtime config injection, or a health endpoint |
| `references/deploys.md` | Running a deploy, setting up blue/green, rolling back, or planning migration safety |

## Environment Variables

```bash
# .env.example — commit this, not .env
DATABASE_URL=
SECRET_KEY_BASE=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_TENANT_ID=
ANTHROPIC_API_KEY=

# Use Infisical for secrets management
infisical run --env=prod -- docker compose up -d
```

## Persistent Data

```yaml
services:
  app:
    volumes:
      - app-data:/app/data  # SQLite, uploads, etc.

volumes:
  app-data:
    driver: local
```

## Rules
- Always use `restart: unless-stopped` — not `always` (allows manual stops)
- Always add health checks — Traefik uses them for routing decisions
- Never expose ports directly — let Traefik handle external traffic
- Use named volumes for persistent data — bind mounts are fragile
- Multi-stage builds for smaller images — don't ship build tools
- Use `.env.example` for templates, `.env` for actual values (gitignored)
- External `web` network shared across all services behind Traefik
- SSL via Let's Encrypt HTTP challenge — requires port 80 open
- Log with `docker compose logs -f --tail=50` after deploy to verify
