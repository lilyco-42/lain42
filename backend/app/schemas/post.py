import uuid
from datetime import datetime
from pydantic import BaseModel


class ConfigFileItem(BaseModel):
    path: str
    content: str
    language: str = "plaintext"


class PostCreate(BaseModel):
    title: str
    description: str = ""
    content: str = ""
    config_files: list[ConfigFileItem] = []
    category: str = "other"
    tags: list[str] = []
    image_ids: list[uuid.UUID] = []


class PostUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    content: str | None = None
    config_files: list[ConfigFileItem] | None = None
    category: str | None = None
    tags: list[str] | None = None
    image_ids: list[uuid.UUID] | None = None


class ImageResponse(BaseModel):
    id: uuid.UUID
    url_original: str
    url_600: str
    url_300: str

    model_config = {"from_attributes": True}


class AuthorBrief(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str
    avatar_url: str

    model_config = {"from_attributes": True}


class PostListResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    cover_image: str
    category: str
    tags: list[str]
    author: AuthorBrief
    likes_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PostDetailResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    content: str
    cover_image: str
    config_files: list[dict]
    category: str
    tags: list[str]
    author: AuthorBrief
    images: list[ImageResponse]
    likes_count: int
    created_at: datetime
    updated_at: datetime
    is_liked: bool = False

    model_config = {"from_attributes": True}


class PostListPage(BaseModel):
    items: list[PostListResponse]
    total: int
    page: int
    per_page: int
