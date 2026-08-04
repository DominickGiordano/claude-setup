# Change notifications — Areté

Read when: Creating subscriptions, handling webhook callbacks, or renewing subscriptions.
Core conventions and rules are in `../SKILL.md`.

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
