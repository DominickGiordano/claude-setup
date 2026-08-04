# Deploy, blue/green and rollback — Areté

Read when: Running a deploy, setting up blue/green, rolling back, or planning migration safety.
Core conventions and rules are in `../SKILL.md`.

## Deployment Commands

### Standard Deploy
```bash
# Pull latest, rebuild, restart with zero downtime
docker compose pull
docker compose build --no-cache
docker compose up -d --force-recreate
docker compose logs -f --tail=50
```

### Blue/Green Deploy (arilearn-phx pattern)

Two app services (`app_blue`, `app_green`) in the same docker-compose.yml. One stable Traefik router targets the active color via `ACTIVE_COLOR` env var.

```yaml
# Both colors get the SAME stable router label — critical!
# This prevents the router from disappearing when old color stops
services:
  app_blue:
    labels:
      - "traefik.http.routers.app.rule=Host(`app.example.com`)"
      - "traefik.http.routers.app.service=app-${ACTIVE_COLOR:-blue}"
      - "traefik.http.services.app-blue.loadbalancer.server.port=4000"
  app_green:
    labels:
      - "traefik.http.routers.app.rule=Host(`app.example.com`)"
      - "traefik.http.routers.app.service=app-${ACTIVE_COLOR:-blue}"
      - "traefik.http.services.app-green.loadbalancer.server.port=4000"
```

Deployment flow:
```bash
# scripts/blue_green_deploy.sh
# 1. Detect current active color (from state file or labels)
# 2. Build image
# 3. Run migrations (pre-cutover, expand-only)
# 4. Start inactive color
# 5. Health gate: internal check via Docker network
# 6. Switch ACTIVE_COLOR → recreate to update Traefik labels
# 7. Health gate: public HTTPS check
# 8. Stop old color (optional: KEEP_OLD_COLOR=1 to keep it running)
```

**Critical gotcha**: Stable router labels must exist on BOTH colors. If you anchor the router to only one color, it disappears when that color is stopped.

### Rollback
```bash
./scripts/blue_green_deploy.sh rollback [color]
# Flips traffic back, validates health before and after
# State persisted in .deploy/blue_green_state.env
```

### Migration Safety (Expand/Contract for Blue/Green)
During blue/green, old and new app versions run simultaneously:
- **Expand**: Add columns, new tables, additive indexes (backward compatible)
- **Deploy**: Code reads/writes both old and new schema
- **Contract**: Remove old columns in a later release (after old code is gone)
- **Never**: Drop columns still used by old code, rename without shim
