# Org Conventions — Areté Capital Partners

## Secrets
- All secrets via **Infisical Cloud** -- single source of truth
- Never use AWS SSM Parameter Store for app secrets
- Local dev: `infisical run -- <command>`
- New services: provision Infisical path before wiring the app
- After Terraform apply: verify Infisical auto-push ran

## Auth
- **Entra ID (Azure AD)** via MSAL for all auth flows
- When touching auth: confirm which Entra app registration this belongs to

## Cloud / Infra
- **GitHub org:** `aretecp`
- **AWS compute:** ECS Fargate (services), Lambda (event-driven/scheduled)
- **Networking:** Tailscale sidecar for ECS -> self-hosted VPS (Postgres/Redis)
- **IaC:** Terraform via Terraform Cloud, org `arete-intelligence`
- **TF Cloud workspaces:**
  - `arete-terraform-infrastructure` — core AWS (VPC, IAM, ECR, networking)
  - `arete-intelligence-site` — app infra (ECS, ALB, DNS)
  - `arete-entra-apps` — Entra ID app registrations (~16 apps)
- **DNS/TLS:** Route53 + ACM
- Auth to AWS: OIDC from TF Cloud — no static IAM keys anywhere
- ECS secrets: Infisical runtime injection — not SSM Parameter Store

## CI/CD
- GitHub Actions + OIDC to AWS — no long-lived credentials
- Infisical action for secret injection in workflows

## Common Mistakes
- SSM Parameter Store instead of Infisical
- Forgetting Tailscale sidecar when ECS needs to reach the VPS
- Hardcoding AWS region (always `var.aws_region`)
- Using `.env` in production containers
- Missing Infisical auto-push verification after Terraform apply
