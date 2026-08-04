# Auth and GraphClient — Areté

Read when: Setting up authentication — client credentials, device code flow, or the GraphClient wrapper.
Core conventions and rules are in `../SKILL.md`.

## Authentication

### Client Credentials — Token Provider Pattern (Preferred)
```python
from typing import Callable
from msal import ConfidentialClientApplication

APP_SCOPES = ["https://graph.microsoft.com/.default"]

def get_token_provider(config: dict) -> Callable[[], str]:
    """Return a callable that provides a fresh Graph API access token.
    Uses app-only auth (client credentials). Inject into GraphClient."""
    app = ConfidentialClientApplication(
        client_id=config["MICROSOFT_CLIENT_ID"],
        client_credential=config["MICROSOFT_CLIENT_SECRET"],
        authority=f"https://login.microsoftonline.com/{config['MICROSOFT_TENANT_ID']}",
    )

    def _get_token() -> str:
        result = app.acquire_token_for_client(scopes=APP_SCOPES)
        if result and "access_token" in result:
            return result["access_token"]
        error = result.get("error_description", result) if result else "No result"
        raise RuntimeError(f"App-only token acquisition failed: {error}")

    _get_token()  # Verify on first call
    return _get_token
```

### Device Code Flow (Interactive — CLI Tools)
```python
from msal import PublicClientApplication
from msal_extensions import PersistedTokenCache, FilePersistence

DELEGATED_SCOPES = ["Mail.Read", "Mail.ReadWrite", "Mail.Send", "User.Read"]

def get_access_token(config: dict) -> str:
    cache = PersistedTokenCache(FilePersistence(".token_cache.bin"))
    app = PublicClientApplication(
        client_id=config["MICROSOFT_CLIENT_ID"],
        authority=f"https://login.microsoftonline.com/{config['MICROSOFT_TENANT_ID']}",
        token_cache=cache,
    )

    # Try cached token first
    accounts = app.get_accounts()
    if accounts:
        result = app.acquire_token_silent(DELEGATED_SCOPES, account=accounts[0])
        if result and "access_token" in result:
            return result["access_token"]

    # Interactive flow
    flow = app.initiate_device_flow(scopes=DELEGATED_SCOPES)
    if "user_code" not in flow:
        raise RuntimeError(f"Device flow failed: {flow.get('error_description')}")
    print(f"Go to: {flow['verification_uri']}")
    print(f"Enter code: {flow['user_code']}")
    result = app.acquire_token_by_device_flow(flow)
    if "access_token" not in result:
        raise RuntimeError(f"Auth failed: {result.get('error_description')}")
    return result["access_token"]
```

## GraphClient Class (Production Pattern)

```python
import asyncio
import httpx
from typing import Callable

BASE_URL = "https://graph.microsoft.com/v1.0"
MAX_RETRIES = 5
INITIAL_BACKOFF = 2.0
MAX_BACKOFF = 60.0

class GraphClient:
    def __init__(self, token_provider: Callable[[], str]):
        self._get_token = token_provider
        self._client = httpx.AsyncClient(
            base_url=BASE_URL,
            headers={"Content-Type": "application/json"},
            timeout=30.0,
        )

    async def close(self):
        await self._client.aclose()

    async def _request(self, method: str, url: str, **kwargs) -> httpx.Response:
        token = self._get_token()  # Fresh token every request
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {token}"

        backoff = INITIAL_BACKOFF
        for attempt in range(MAX_RETRIES):
            resp = await self._client.request(method, url, headers=headers, **kwargs)
            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", str(int(backoff))))
                wait = min(retry_after, MAX_BACKOFF)
                logger.warning(f"Throttled (429). Retry in {wait}s ({attempt + 1}/{MAX_RETRIES})")
                await asyncio.sleep(wait)
                backoff = min(backoff * 2, MAX_BACKOFF)
                continue
            if resp.status_code >= 400:
                logger.error(f"Graph API {resp.status_code}: {method} {url} — {resp.text}")
            resp.raise_for_status()
            return resp
        raise RuntimeError(f"Graph API failed after {MAX_RETRIES} retries: {method} {url}")
```
