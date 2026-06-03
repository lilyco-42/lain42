import uuid
from datetime import datetime
from pydantic import BaseModel


class CollectionCreate(BaseModel):
    name: str
    description: str = ""
    is_public: bool = True
    is_subscribed: bool = False


class CollectionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_public: bool | None = None
    is_subscribed: bool | None = None


class CollectionResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    is_public: bool
    is_subscribed: bool
    post_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}
