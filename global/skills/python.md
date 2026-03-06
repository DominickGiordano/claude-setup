---
name: python
description: Use when writing Python scripts, services, data processing, or AI tooling. Covers Areté conventions for Python 3.11+.
---

# Python Patterns — Areté

## Project Setup
```toml
# pyproject.toml (preferred over setup.py / requirements.txt)
[project]
name = "project-name"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "anthropic>=0.30",
    "pydantic>=2.0",
]

[tool.ruff]          # linter + formatter
line-length = 100
target-version = "py311"
```

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
```

## Types — Always
```python
# Use type hints everywhere. Python 3.11+ — use built-ins not typing module
def process(items: list[str], limit: int = 10) -> dict[str, int]:
    ...

# Pydantic for data validation / config
from pydantic import BaseModel, Field

class Config(BaseModel):
    api_key: str
    max_retries: int = Field(default=3, ge=1, le=10)
    debug: bool = False
```

## Async
```python
import asyncio
import httpx  # async HTTP — not requests

async def fetch(url: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()

# Parallel
results = await asyncio.gather(fetch(url1), fetch(url2))
```

## Error Handling
```python
# Custom exceptions — be specific
class AppError(Exception):
    def __init__(self, message: str, code: str) -> None:
        super().__init__(message)
        self.code = code

# Context managers for cleanup
from contextlib import asynccontextmanager

@asynccontextmanager
async def db_transaction(conn):
    async with conn.transaction():
        yield conn
```

## Environment / Config
```python
# Use pydantic-settings — validates and types env vars
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str
    database_url: str
    debug: bool = False

    class Config:
        env_file = ".env"

settings = Settings()  # fails fast if required vars missing
```

## CLI Scripts
```python
#!/usr/bin/env python3
# Use typer for CLI tools
import typer

app = typer.Typer()

@app.command()
def main(
    input_file: str = typer.Argument(..., help="Input path"),
    dry_run: bool = typer.Option(False, "--dry-run"),
) -> None:
    ...

if __name__ == "__main__":
    app()
```

## Rules
- Python 3.11+ — use match/case, `tomllib`, `TaskGroup`
- Pydantic v2 for all data models
- `ruff` for linting and formatting — no black/flake8/pylint separately
- `pytest` for tests — no unittest
- Absolute imports only — no relative `from ..module`
- No mutable default args: `def fn(items: list = None)` → `None` then assign
