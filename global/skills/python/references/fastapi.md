# FastAPI — Areté

Read when building or modifying a FastAPI service. Core Python conventions are in `../SKILL.md`.

## App + lifespan

```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init DB, connections, etc.
    await init_db()
    yield
    # Shutdown: cleanup
    await close_db()

app = FastAPI(title="Service Name", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.aretecap.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Use `lifespan` — `on_event` decorators are deprecated.

## Routers

```python
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/items", tags=["items"])

@router.get("/", response_model=list[ItemResponse])
async def list_items(
    limit: int = 10,
    offset: int = 0,
    db: Database = Depends(get_db),
) -> list[ItemResponse]:
    return await db.fetch_items(limit=limit, offset=offset)

@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    payload: ItemCreate,
    db: Database = Depends(get_db),
) -> ItemResponse:
    return await db.create_item(payload)
```

## Dependencies

```python
from fastapi import Depends, Header, HTTPException

async def verify_token(authorization: str = Header(...)) -> dict:
    token = authorization.removeprefix("Bearer ")
    try:
        payload = decode_jwt(token)
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload

@router.get("/me")
async def get_me(user: dict = Depends(verify_token)) -> dict:
    return user
```

## Testing

```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_list_items(client: AsyncClient):
    response = await client.get("/api/v1/items/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_create_item(client: AsyncClient):
    response = await client.post("/api/v1/items/", json={"name": "Test"})
    assert response.status_code == 201
    assert response.json()["name"] == "Test"
```

Use `ASGITransport` against the app object — don't spin up a real server in tests.
