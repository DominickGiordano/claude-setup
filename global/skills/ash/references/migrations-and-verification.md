# Migrations and caller verification — Areté (Ash)

Read when: generating an AshPostgres migration, naming an identity index, or you have just defined a new action and need to confirm something calls it.
The core Ash overrides and gotchas are in `../SKILL.md`.

## Migration index naming for identities

When an Ash identity gets an `ash_postgres` migration, AshPostgres can only
translate Postgres error 23505 → `Ash.Error.Invalid` when the index name
follows the convention `<table>_<identity_name>_index`. Otherwise you get an
opaque `Ash.Error.Unknown` with no field attribution.

```elixir
# In the generated migration
create unique_index(:users, [:email], name: :users_unique_email_index)
#                                          ^^^^^^^^^^^^^^^^^^^^^^^^^
#                                          must match identity_name
```

When you add a new identity, eyeball the generated migration before running
it.

## Verify production callers exist after defining an action

`mix compile` and `mix test` will pass for an action that has NO production
caller (factories and tests can call it directly). The bug only surfaces when
a real user hits the path.

After defining a new `define :foo` or new action `:foo`:

```bash
grep -rn "\.foo[!(]\|action: :foo" lib/ --include="*.ex" | grep -v "lib/<my_resource>.ex"
```

Zero hits outside the resource itself = P0 unreachable code. Same audit for
state-transition actions (`:abandon`, `:cancel`, `:retry`) — make sure every
`try_again`/`reset`/`new_attempt` handler calls them.

