import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from app.database import Base


class PostCategory(str, enum.Enum):
    software = "software"
    desktop = "desktop"
    dev_env = "dev-env"
    terminal = "terminal"
    editor = "editor"
    system = "system"
    book_source = "book-source"
    other = "other"


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str] = mapped_column(String(512), default="")
    content: Mapped[str] = mapped_column(Text, default="")
    cover_image: Mapped[str] = mapped_column(String(512), default="")
    config_files: Mapped[list] = mapped_column(JSONB, default=list)
    category: Mapped[PostCategory] = mapped_column(default=PostCategory.other)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    likes_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    author = relationship("User", back_populates="posts")
    images = relationship("Image", back_populates="post", order_by="Image.sort_order", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")
