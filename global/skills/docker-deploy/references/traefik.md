# Traefik reverse proxy — Areté

Read when: Configuring Traefik — static config, middleware, router labels, TLS.
Core conventions and rules are in `../SKILL.md`.

## Traefik Reverse Proxy

### Traefik Static Config (traefik.yml)
```yaml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

providers:
  docker:
    exposedByDefault: false
  file:
    filename: /etc/traefik/dynamic.yml
    watch: true

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /etc/traefik/acme/acme.json
      httpChallenge:
        entryPoint: web

api:
  dashboard: true

accessLog:
  format: json
```

### Traefik Dynamic Config (dynamic.yml) — Middleware
```yaml
http:
  middlewares:
    security-headers:
      headers:
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
        referrerPolicy: "strict-origin-when-cross-origin"
    rate-limit:
      rateLimit:
        average: 1000
        burst: 500
        period: "1s"
    https-redirect:
      redirectScheme:
        scheme: https
        permanent: true
```

### Traefik Service (docker-compose)
```yaml
services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./traefik.yml:/etc/traefik/traefik.yml:ro"
      - "./dynamic.yml:/etc/traefik/dynamic.yml:ro"
      - "traefik_certs:/etc/traefik/acme"
    networks:
      - web

volumes:
  traefik_certs:

networks:
  web:
    name: aichat_openwebui-network
```
