---
name: microsoft-graph
description: Use when integrating with Microsoft Graph API — mail, calendar, webhooks, users, or any Microsoft 365 service. Covers auth (MSAL), common endpoints, and async patterns.
---

# Microsoft Graph API — Areté Patterns

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

## Mail

### List Messages
```python
# Get recent messages from a mailbox
messages = await graph_get(client, "/users/{user_id}/mailFolders/inbox/messages"
    "?$top=25"
    "&$orderby=receivedDateTime desc"
    "&$select=id,subject,from,receivedDateTime,bodyPreview,categories"
)
```

### Move Message
```python
await client.post(
    f"/users/{user_id}/messages/{message_id}/move",
    json={"destinationId": folder_id},
)
```

### Categorize Message
```python
await client.patch(
    f"/users/{user_id}/messages/{message_id}",
    json={"categories": ["Important", "Follow Up"]},
)
```

### Search Messages
```python
# KQL search
messages = await graph_get(client,
    f"/users/{user_id}/messages"
    f"?$search=\"from:{sender} AND subject:{keyword}\""
    f"&$top=10"
)
```

## Webhooks (Change Notifications)

### Create Subscription
```python
subscription = await client.post(
    "/subscriptions",
    json={
        "changeType": "created,updated",
        "notificationUrl": "https://app.example.com/api/webhooks/graph",
        "resource": f"/users/{user_id}/mailFolders/inbox/messages",
        "expirationDateTime": (datetime.utcnow() + timedelta(hours=4)).isoformat() + "Z",
        "clientState": settings.webhook_secret,  # verify in handler
    },
)
```

### Webhook Handler (FastAPI)
```python
from fastapi import Request, Response

@router.post("/webhooks/graph")
async def handle_graph_webhook(request: Request) -> Response:
    body = await request.json()

    # Validation token — Graph sends this on subscription creation
    if "validationToken" in dict(request.query_params):
        return Response(
            content=request.query_params["validationToken"],
            media_type="text/plain",
        )

    # Process notifications
    for notification in body.get("value", []):
        if notification.get("clientState") != settings.webhook_secret:
            continue  # skip tampered notifications
        resource = notification["resource"]
        change_type = notification["changeType"]
        await process_notification(resource, change_type)

    return Response(status_code=202)
```

### Renew Subscriptions (Background Task)
```python
# Subscriptions expire — renew before expiry
async def renew_subscription(subscription_id: str):
    await client.patch(
        f"/subscriptions/{subscription_id}",
        json={
            "expirationDateTime": (datetime.utcnow() + timedelta(hours=4)).isoformat() + "Z",
        },
    )
```

## Permissions Model

### Application vs Delegated
| Type | When | Example Scopes |
|------|------|---------------|
| **Application** | Background services, no user context | `Mail.Read`, `Mail.ReadWrite` (app-level) |
| **Delegated** | User-facing apps with SSO | `Mail.Read`, `Calendars.Read` |

### Application Access Policy (Restrict App Permissions)
```powershell
# Restrict app-only access to specific mailboxes (not all users)
New-ApplicationAccessPolicy -AppId $appId `
    -PolicyScopeGroupId $securityGroupId `
    -AccessRight RestrictAccess
```

## Folder Management

```python
async def get_or_create_folder(self, mailbox: str, name: str, cache: dict) -> str:
    """Return folder ID, creating if needed. Cache avoids repeated list calls."""
    if name.lower() in ("inbox", "drafts", "sentitems", "deleteditems"):
        return name  # Well-known names work as destination IDs

    if name in cache:
        return cache[name]

    # Populate cache from API
    resp = await self._request("GET", f"/users/{mailbox}/mailFolders", params={"$top": "100"})
    for f in resp.json().get("value", []):
        cache[f["displayName"]] = f["id"]

    if name in cache:
        return cache[name]

    # Create new folder
    resp = await self._request("POST", f"/users/{mailbox}/mailFolders",
        json={"displayName": name})
    folder_id = resp.json()["id"]
    cache[name] = folder_id
    return folder_id
```

## Master Categories (Outlook Tags)

```python
async def ensure_category(self, mailbox: str, display_name: str, color: str = "preset2"):
    """Create a master category if it doesn't exist. 409 = already exists (expected)."""
    resp = await self._client.request(
        "POST", f"/users/{mailbox}/outlook/masterCategories",
        headers={"Authorization": f"Bearer {self._get_token()}",
                 "Content-Type": "application/json"},
        json={"displayName": display_name, "color": color},
    )
    if resp.status_code == 409:
        return  # Already exists — expected
    if resp.status_code >= 400:
        resp.raise_for_status()
```

## Error Handling

Retry logic is built into `GraphClient._request()` above. Additional patterns:

```python
# 409 Conflict — idempotent creates (categories, folders)
if resp.status_code == 409:
    return  # Already exists, not an error

# Robust field extraction from notification payloads
subject = email.get("subject", "(no subject)")
sender = email.get("from", {}).get("emailAddress", {}).get("address", "unknown")
message_id = resource.rsplit("/", 1)[-1] if "/" in resource else None
```

## Pagination

```python
async def graph_get_all(client: httpx.AsyncClient, endpoint: str) -> list[dict]:
    """Follow @odata.nextLink to get all pages."""
    results = []
    url = endpoint
    while url:
        data = await graph_get(client, url)
        results.extend(data.get("value", []))
        url = data.get("@odata.nextLink")
        if url:
            url = url.replace(GRAPH_BASE, "")  # make relative
    return results
```

## Rules
- Always use `httpx.AsyncClient` — not `requests`
- Reuse client instances (connection pooling)
- Handle 429 rate limits with Retry-After header
- Webhook subscriptions expire — always set up renewal
- Verify `clientState` in webhook handlers to prevent tampering
- Use `$select` to limit response fields — Graph returns everything by default
- Application Access Policy is required for production — don't give apps access to all mailboxes
- Token caching: MSAL handles this internally, don't build your own cache
