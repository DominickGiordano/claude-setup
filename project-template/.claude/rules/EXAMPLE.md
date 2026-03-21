---
paths:
  - "src/api/**"
  - "src/routes/**"
---
# API Conventions (EXAMPLE — delete or rename this file)

<!-- This is an example path-scoped rule file. Rules here only load when
     Claude is working on files matching the paths above.

     Use rules/ files to keep CLAUDE.md under 200 lines. Move path-specific
     details here instead of bloating the main file.

     Files WITHOUT a paths: field load every session (like CLAUDE.md).
     Files WITH paths: only load when editing matching files. -->

- All endpoints return `{ data, error, meta }` shape
- Validate request bodies with Pydantic/Zod at the boundary
- Use dependency injection for database connections
- Return 404 with descriptive message, never empty 200
