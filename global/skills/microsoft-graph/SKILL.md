---
name: microsoft-graph
description: >-
  Integrating Microsoft Graph and Microsoft 365: MSAL auth, common endpoints, async patterns,
  Outlook mail and calendar, webhooks, Entra ID, Teams, SharePoint, OneDrive.
when_to_use: >-
  Calling any Graph API. Triggers: graph api, microsoft graph, msal, outlook, 365, entra,
  azure ad, teams api, sharepoint, calendar api, mail api.
---

# Microsoft Graph API — Areté Patterns

## References

Load only what the task needs — these do not enter context until you read them:

| File | Read when |
|---|---|
| `references/auth.md` | Setting up authentication — client credentials, device code flow, or the GraphClient wrapper |
| `references/mail.md` | Listing, moving, categorizing or searching messages |
| `references/webhooks.md` | Creating subscriptions, handling webhook callbacks, or renewing subscriptions |
| `references/permissions-folders.md` | Choosing application vs delegated permissions, restricting mailbox access, or managing folders and master categories |

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
