---
paths:
  - "src/api/**"
  - "src/lib/**"
  - "src/services/**"
  - "*.py"
  - "*.ex"
---
# Backend Rules

- Check `backend-standards` skill for full Arete backend conventions
- All secrets via Infisical -- never hardcoded, never `.env` in prod
- API responses: `{ data, error, meta }` shape -- consistent everywhere
- Validate at the boundary: Pydantic (Python), Zod (TypeScript), Ecto changesets (Elixir)
- Explicit error handling -- no silent catches, structured error responses
- Type everything: type hints (Python), `strict: true` (TypeScript), specs (Elixir)
- Run test commands after changes
