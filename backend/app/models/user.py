import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Enum as SAEnum, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class OAuthProvider(str, enum.Enum):
    github = "github"
    gitee = "gitee"
    gitcode = "gitcode"
    qq = "qq"
    wechat = "wechat"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    avatar_url: Mapped[str] = mapped_column(String(512), default="")
    email: Mapped[str | None] = mapped_column(String(256), unique=True, nullable=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(256), nullable=True)
    oauth_provider: Mapped[OAuthProvider | None] = mapped_column(SAEnum(OAuthProvider), nullable=True)
    oauth_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    registration_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    posts = relationship("Post", back_populates="author")
    collections = relationship("Collection", back_populates="user")
    likes = relationship("Like", back_populates="user")

    @property
    def is_oauth_user(self) -> bool:
        return self.oauth_provider is not None
