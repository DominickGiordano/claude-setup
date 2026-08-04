# Pydantic v2 — Areté

Read when defining or changing data models. Config/settings usage is in `../SKILL.md`.

## Models and validators

```python
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator

class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    tags: list[str] = Field(default_factory=list)
    priority: int = Field(default=0, ge=0, le=5)

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, v: list[str]) -> list[str]:
        return [t.lower().strip() for t in v]

class ItemResponse(ItemCreate):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}  # replaces v1 orm_mode
```

## v1 → v2 gotchas

- `model_config = {...}` replaces the inner `class Config`
- `from_attributes` replaces `orm_mode`
- `@field_validator` replaces `@validator`; it needs `@classmethod` under it
- `@model_validator` replaces `@root_validator`
- `default_factory` for mutable defaults — never a bare `[]` or `{}`
- `.model_dump()` / `.model_validate()` replace `.dict()` / `.parse_obj()`
