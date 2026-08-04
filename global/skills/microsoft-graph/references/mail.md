# Mail operations — Areté

Read when: Listing, moving, categorizing or searching messages.
Core conventions and rules are in `../SKILL.md`.

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
