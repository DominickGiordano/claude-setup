---
paths:
  - "terraform/**"
  - "infra/**"
  - ".github/workflows/**"
  - "*.tf"
---
# Infra Rules

- Check `infra-standards` skill for full Arete IaC conventions
- Confirm TF Cloud workspace before writing Terraform
- Always `terraform plan` before apply -- review output
- All resources tagged: `environment`, `project`, `owner`
- IAM: least privilege, no `*` without justification, no IAM users, OIDC only
- Secrets via Infisical -- not SSM Parameter Store, not hardcoded
- Tailscale sidecar required for ECS tasks needing VPS (Postgres/Redis)
- Pin container image tags -- no `latest`
- GitHub Actions: pin action versions to SHA, OIDC for AWS auth
