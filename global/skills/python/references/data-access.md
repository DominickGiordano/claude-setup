# Async data access — Areté (Python)

Read when talking to SQLite or an HTTP API from async Python.

## Async SQLite (aiosqlite)

```python
import aiosqlite

DB_PATH = "data/app.db"

async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db

async def fetch_items(db: aiosqlite.Connection, limit: int = 10) -> list[dict]:
    async with db.execute(
        "SELECT * FROM items ORDER BY created_at DESC LIMIT ?", (limit,)
    ) as cursor:
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
```

Always set `journal_mode=WAL` and `foreign_keys=ON` — neither is on by default.

## httpx async client

```python
import httpx

# Reuse the client across requests so connections pool. Constructing one per
# call is the most common cause of slow outbound calls in our services.
async def make_api_client(token: str) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url="https://graph.microsoft.com/v1.0",
        timeout=httpx.Timeout(30.0),
        headers={"Authorization": f"Bearer {token}"},
    )

async def fetch_data(client: httpx.AsyncClient, endpoint: str) -> dict:
    response = await client.get(endpoint)
    response.raise_for_status()
    return response.json()
```

Always set an explicit `timeout` — httpx has no default deadline on some transports.
