# Docker Compose services — Areté

Read when: Writing or changing a docker-compose service definition.
Core conventions and rules are in `../SKILL.md`.

## Docker Compose Service

### Python/FastAPI App
```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: app-name
    restart: unless-stopped
    env_file: .env
    environment:
      - PORT=8000
    expose:
      - "8000"
    healthcheck:
      test: ["CMD-SHELL", "python -c \"import urllib.request; urllib.request.urlopen('http://localhost:8000/health')\""]
      interval: 15s
      timeout: 5s
      retries: 5
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`app.example.com`)"
      - "traefik.http.routers.app.entrypoints=websecure"
      - "traefik.http.routers.app.tls=true"
      - "traefik.http.routers.app.tls.certresolver=letsencrypt"
      - "traefik.http.routers.app.middlewares=security-headers@file,rate-limit@file"
      - "traefik.http.services.app.loadbalancer.server.port=8000"
      - "traefik.docker.network=aichat_openwebui-network"
    networks:
      - web

networks:
  web:
    external: true
    name: aichat_openwebui-network  # shared across all Areté services
```

### Elixir/Phoenix App
```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        MIX_ENV: prod
    container_name: phoenix-app
    restart: unless-stopped
    env_file: .env
    environment:
      - PHX_HOST=app.example.com
      - PORT=4000
      - SECRET_KEY_BASE=${SECRET_KEY_BASE}
      - DATABASE_URL=${DATABASE_URL}
    expose:
      - "4000"
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://localhost:${PORT:-4000}/healthz || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.phoenix.rule=Host(`app.example.com`)"
      - "traefik.http.routers.phoenix.entrypoints=websecure"
      - "traefik.http.routers.phoenix.tls=true"
      - "traefik.http.routers.phoenix.tls.certresolver=letsencrypt"
      - "traefik.http.routers.phoenix.middlewares=security-headers@file,rate-limit@file"
      - "traefik.http.services.phoenix.loadbalancer.server.port=4000"
      - "traefik.docker.network=aichat_openwebui-network"
    networks:
      - web
```
