# Permissions, folders, categories — Areté

Read when: Choosing application vs delegated permissions, restricting mailbox access, or managing folders and master categories.
Core conventions and rules are in `../SKILL.md`.

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
