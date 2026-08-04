# Dockerfiles and health checks — Areté

Read when: Writing a Dockerfile, a multi-stage build, SPA runtime config injection, or a health endpoint.
Core conventions and rules are in `../SKILL.md`.

## Multi-Stage Dockerfiles

### Python
```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir .

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Elixir/Phoenix
```dockerfile
FROM elixir:1.17-slim AS builder
ENV MIX_ENV=prod
WORKDIR /app
RUN mix local.hex --force && mix local.rebar --force
COPY mix.exs mix.lock ./
RUN mix deps.get --only prod && mix deps.compile
COPY . .
RUN mix assets.deploy && mix release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y libssl3 libncurses6 curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/_build/prod/rel/app_name ./
EXPOSE 4000
CMD ["bin/app_name", "start"]
```

### Node.js/Next.js (3-Stage)
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### SPA Runtime Config Injection
```bash
#!/bin/sh
# docker-entrypoint.sh — inject env vars into static SPA at runtime
sed -i "s|</head>|<script>window.__CONFIG__={apiUrl:\"${API_URL}\",clientId:\"${CLIENT_ID}\"};</script></head>|" \
  /usr/share/nginx/html/index.html
exec nginx -g "daemon off;"
```

## Health Check Endpoint

### FastAPI
```python
@app.get("/health")
async def health():
    return {"status": "ok"}
```

### Phoenix
```elixir
# In router.ex
get "/health", HealthController, :index

# In health_controller.ex
def index(conn, _params) do
  json(conn, %{status: "ok"})
end
```
