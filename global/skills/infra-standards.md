---
name: infra-standards
description: >
  Use when doing any infrastructure work -- Terraform, AWS, CI/CD, Docker,
  deployment, IAM, ECS, Lambda, GitHub Actions, Tailscale. Covers Arete
  IaC and cloud conventions. Load alongside terraform and docker-deploy
  skills for implementation patterns.
---

# Infra Standards -- Arete

## Stack

| Layer | Tech |
|---|---|
| IaC | Terraform via Terraform Cloud |
| TF Cloud org | `arete-intelligence` |
| AWS auth (TF) | OIDC -- no static keys |
| Compute | ECS Fargate (services), Lambda (event-driven/scheduled) |
| Networking | Tailscale sidecar (ECS -> self-hosted VPS) |
| Secrets | Infisical -- auto-push post-apply |
| CI/CD | GitHub Actions + OIDC to AWS |
| GitHub org | `aretecp` |
| DNS/TLS | Route53 + ACM |

## TF Cloud Workspaces

| Workspace | Owns |
|---|---|
| `arete-terraform-infrastructure` | Core AWS -- VPC, IAM, ECR, base networking |
| `arete-intelligence-site` | App/site infra -- ECS services, ALB, DNS |
| `arete-entra-apps` | Entra ID app registrations (~16 apps) |

## Before Writing Any Terraform

1. Which workspace does this change belong to? Confirm before writing.
2. Does a module already exist for this pattern? Check before creating new.
3. State in TF Cloud? Never use local state.
4. Plan before apply -- always. Review output before proceeding.
5. Significant changes: write a `PLAN.md` spec first, execute after review.

## Terraform Standards

- Every resource: `environment`, `project`, `owner` tags -- no exceptions
- State: Terraform Cloud only -- never local, never S3 without TF Cloud backend
- Auth to AWS: OIDC from TF Cloud -- no static IAM keys anywhere
- Reuse existing modules before creating new ones
- Variables: typed, described -- no bare `variable "x" {}`
- Sensitive values: marked `sensitive = true`, sourced from Infisical
- After apply: verify Infisical auto-push ran

## AWS Standards

**IAM -- Least Privilege Always**
- Role per service -- no shared roles across unrelated services
- No `*` actions without explicit justification in a comment
- No IAM users -- roles + OIDC only
- OIDC for GitHub Actions -> AWS -- no long-lived keys

**ECS Fargate**
- Tailscale sidecar required for any task needing VPS connectivity (Postgres/Redis)
- Task role via OIDC -- no access keys in task definitions
- Secrets injected at runtime via Infisical -- not SSM Parameter Store
- Health checks required on all services
- Always set explicit CPU/memory -- never rely on defaults

**Lambda**
- Use for: event-driven, short-lived, scheduled (EventBridge)
- EventBridge for scheduling -- not CloudWatch Events directly
- Always set explicit timeout and memory
- Python: `aws-lambda-powertools` for logging/tracing/metrics
- Async invocations: DLQ or explicit error destinations required

**Networking**
- ECS tasks needing VPS: Tailscale sidecar pattern -- see existing task defs
- No public IPs on tasks unless explicitly required
- Security groups: least privilege, named descriptively, tagged

**S3**
- Block public access by default
- Versioning on buckets holding critical state or assets
- Lifecycle rules on log/temp buckets

## CI/CD (GitHub Actions)

- OIDC to AWS -- no long-lived credentials in GitHub secrets for AWS auth
- Infisical action for secret injection in workflows
- Branch protection: PRs required for main, status checks must pass
- Workflow files: pin action versions to SHA -- not floating tags
- Reuse composite actions for repeated patterns

## Self-Review

Before marking infra work done:
- [ ] Workspace confirmed before writing
- [ ] Plan reviewed before apply
- [ ] All resources tagged: environment, project, owner
- [ ] IAM: no `*` without justification, no IAM users
- [ ] No static credentials in the diff
- [ ] Tailscale sidecar included if ECS -> VPS needed
- [ ] Infisical push confirmed post-apply
- [ ] State backend is TF Cloud, not local
- [ ] Sensitive variables marked `sensitive = true`
- [ ] Container images pinned -- no `latest` tags

## Common Arete Infra Mistakes

- SSM Parameter Store instead of Infisical for secrets
- Hardcoding AWS region -- always `var.aws_region`
- IAM users instead of roles + OIDC
- Skipping `terraform plan` review before large applies
- Missing Tailscale sidecar when ECS service needs database access
- Using `latest` tag on container images
- Missing resource tags -- breaks cost attribution and auditing
- Local state during prototyping that never migrates to TF Cloud
