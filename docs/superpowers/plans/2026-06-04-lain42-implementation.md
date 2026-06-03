# Lain42 MVP 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个类 Pinterest 的配置分享平台 — 用户 OAuth 登录、发布带截图的配置帖子、首页瀑布流浏览、搜索筛选、收藏夹、点赞、Rust TUI 客户端自动同步配置。

**Architecture:** Monorepo — backend (FastAPI + gRPC 同进程)、frontend (Vite React SPA)、proto (共享)。PostgreSQL 存储所有数据，图片存本地文件系统由 Nginx serve。Rust TUI 客户端通过 gRPC 连接同步配置。

**Tech Stack:** Python 3.14, FastAPI, SQLAlchemy 2.0 async, Alembic, grpcio, Pydantic v2, PostgreSQL 17, React 18, Vite, shadcn/ui, Tailwind CSS, react-router-dom v7, TanStack Query v5, Zustand, react-virtuoso, Monaco Editor, Rust, tonic, ratatui, tokio

**依赖顺序:** Phase 1 → 2 → 3 → 4 → 5 → 6 → 7（前一步可用再开始下一步）

---

## Phase 1: 项目脚手架 & 基础设施

### Task 1.1: 整理项目结构

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/pyproject.toml`
- Create: `backend/Dockerfile`
- Create: `frontend/` (Vite 脚手架)
- Create: `proto/config_sync.proto`
- Create: `.env.example`
- Create: `docker-compose.yml`
- Create: `nginx.conf`
- Modify: `pyproject.toml` (root)

- [ ] **Step 1: 创建根目录结构和 .env.example**

```bash
mkdir -p backend/app/{models,schemas,api,grpc,services}
mkdir -p frontend/src
mkdir -p proto
```

Write `.env.example`:
```env
# Database
DATABASE_URL=postgresql+asyncpg://lain42:lain42@db:5432/lain42

# JWT
JWT_SECRET=change-me-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30

# OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:5173/login/callback?provider=github

GITEE_CLIENT_ID=
GITEE_CLIENT_SECRET=
GITEE_REDIRECT_URI=http://localhost:5173/login/callback?provider=gitee

GITCODE_CLIENT_ID=
GITCODE_CLIENT_SECRET=
GITCODE_REDIRECT_URI=http://localhost:5173/login/callback?provider=gitcode

# Upload
UPLOAD_DIR=/data/images
MAX_IMAGE_SIZE_MB=2
```

- [ ] **Step 2: 更新根 pyproject.toml**

```toml
[project]
name = "lain42"
version = "0.1.0"
description = "Configuration sharing platform"
requires-python = ">=3.14"
dependencies = [
    "fastapi[standard]>=0.136.3",
]

[tool.uv.sources]
```

- [ ] **Step 3: 创建 backend/pyproject.toml**

```toml
[project]
name = "lain42-backend"
version = "0.1.0"
description = "Lain42 backend services"
requires-python = ">=3.14"
dependencies = [
    "fastapi[standard]>=0.136.3",
    "sqlalchemy[asyncio]>=2.0.36",
    "asyncpg>=0.30.0",
    "alembic>=1.14.0",
    "pydantic[email]>=2.9.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "httpx>=0.28.0",
    "grpcio>=1.68.0",
    "grpcio-tools>=1.68.0",
    "protobuf>=5.29.0",
    "Pillow>=11.0.0",
    "python-multipart>=0.0.18",
    "aiofiles>=24.1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.24.0",
    "httpx>=0.28.0",
]
```

- [ ] **Step 4: 创建 backend/app/config.py**

```python
from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://lain42:lain42@localhost:5432/lain42"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30

    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "http://localhost:5173/login/callback?provider=github"

    gitee_client_id: str = ""
    gitee_client_secret: str = ""
    gitee_redirect_uri: str = "http://localhost:5173/login/callback?provider=gitee"

    gitcode_client_id: str = ""
    gitcode_client_secret: str = ""
    gitcode_redirect_uri: str = "http://localhost:5173/login/callback?provider=gitcode"

    upload_dir: Path = Path("/data/images")
    max_image_size_mb: int = 2

    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

Install `pydantic-settings` to the backend deps — add `"pydantic-settings>=2.6.0"` to dependencies.

- [ ] **Step 5: 创建 backend/app/database.py**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

- [ ] **Step 6: 创建 backend/app/__init__.py** (空文件) 和 **backend/app/main.py** (最小 FastAPI app)

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Lain42", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 7: 创建 backend/Dockerfile**

```dockerfile
FROM python:3.14-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY . .

CMD ["fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 8: 创建 docker-compose.yml（最小版）**

```yaml
version: "3.9"
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: lain42
      POSTGRES_USER: lain42
      POSTGRES_PASSWORD: lain42
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql+asyncpg://lain42:lain42@db:5432/lain42

volumes:
  pgdata:
```

- [ ] **Step 9: 安装依赖并验证健康检查**

```bash
cd backend && uv pip install -e ".[dev]"
# 启动 DB
docker compose up -d db
# 运行 FastAPI
fastapi dev app/main.py
# 测试健康检查
curl http://localhost:8000/api/health
# 预期: {"status":"ok"}
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: project scaffold — FastAPI + PostgreSQL + Docker Compose"
```

---

### Task 1.2: 用 Vite 搭建前端脚手架

- [ ] **Step 1: 创建 Vite + React + TypeScript 项目**

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
```

- [ ] **Step 2: 安装核心依赖**

```bash
npm install react-router-dom@7 @tanstack/react-query zustand react-virtuoso react-markdown rehype-highlight remark-gfm @monaco-editor/react
```

- [ ] **Step 3: 安装 Tailwind CSS + shadcn/ui**

```bash
npm install -D tailwindcss @tailwindcss/vite postcss
```

按 shadcn/ui 最新文档初始化。创建 `tailwind.config.ts` 和 `postcss.config.js`。

```bash
npx shadcn@latest init
# 选择: TypeScript, Neutral, CSS variables: yes
```

添加基础 shadcn 组件：
```bash
npx shadcn@latest add button card input avatar dropdown-menu dialog tabs scroll-area separator badge skeleton tooltip
```

- [ ] **Step 4: 创建前端目录结构**

```bash
mkdir -p src/{components,pages,hooks,lib,stores,types}
```

- [ ] **Step 5: 创建 src/lib/api.ts — API 客户端基础**

```typescript
const API_BASE = import.meta.env.VITE_API_URL || "/api";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail || res.statusText, res.status);
  }

  return res.json();
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
```

- [ ] **Step 6: 创建 src/stores/auth.ts — Zustand 认证 store**

```typescript
import { create } from "zustand";
import { api } from "@/lib/api";

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (provider: string, code: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (provider: string, code: string) => {
    const { access_token, refresh_token } = await api.post<{
      access_token: string;
      refresh_token: string;
    }>("/auth/login", { provider, code });
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    await useAuthStore.getState().fetchMe();
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    try {
      const user = await api.get<User>("/auth/me");
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
```

- [ ] **Step 7: 创建 src/main.tsx 入口**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 8: 创建 src/pages/ 空占位页面和 src/App.tsx 路由骨架**

```typescript
// src/App.tsx
import { Routes, Route } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { useEffect } from "react";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import PostDetailPage from "@/pages/PostDetailPage";
import PublishPage from "@/pages/PublishPage";
import UserProfilePage from "@/pages/UserProfilePage";
import SearchPage from "@/pages/SearchPage";
import SettingsPage from "@/pages/SettingsPage";

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    if (localStorage.getItem("access_token")) {
      fetchMe();
    } else {
      useAuthStore.setState({ isLoading: false });
    }
  }, [fetchMe]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/category/:slug" element={<HomePage />} />
      <Route path="/tag/:tag" element={<HomePage />} />
      <Route path="/post/:id" element={<PostDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/callback" element={<LoginPage />} />
      <Route path="/publish" element={<PublishPage />} />
      <Route path="/edit/:id" element={<PublishPage />} />
      <Route path="/user/:username" element={<UserProfilePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold Vite React SPA with routing, shadcn/ui, stores"
```

---

### Task 1.3: 创建共享 Proto 定义

**Files:**
- Create: `proto/config_sync.proto`

- [ ] **Step 1: 编写 proto 文件**

```protobuf
syntax = "proto3";

package lain42;

service ConfigSync {
  rpc ListSubscriptions(ListSubscriptionsRequest) returns (ListSubscriptionsResponse);
  rpc GetCollectionConfigs(GetCollectionConfigsRequest) returns (GetCollectionConfigsResponse);
  rpc PullConfig(PullConfigRequest) returns (PullConfigResponse);
  rpc CheckUpdates(CheckUpdatesRequest) returns (CheckUpdatesResponse);
}

message ListSubscriptionsRequest {}

message ListSubscriptionsResponse {
  repeated Subscription subscriptions = 1;
}

message Subscription {
  string collection_id = 1;
  string collection_name = 2;
  int32 post_count = 3;
  bool is_subscribed = 4;
}

message GetCollectionConfigsRequest {
  string collection_id = 1;
}

message GetCollectionConfigsResponse {
  string collection_name = 1;
  repeated ConfigSummary configs = 2;
}

message ConfigSummary {
  string post_id = 1;
  string title = 2;
  string version_hash = 3;
  string updated_at = 4;
}

message PullConfigRequest {
  string post_id = 1;
}

message PullConfigResponse {
  string post_id = 1;
  string title = 2;
  string version_hash = 3;
  repeated ConfigFile files = 4;
}

message ConfigFile {
  string path = 1;
  string content = 2;
  string language = 3;
}

message CheckUpdatesRequest {
  repeated ConfigVersion local_configs = 1;
}

message ConfigVersion {
  string post_id = 1;
  string version_hash = 2;
}

message CheckUpdatesResponse {
  repeated string outdated_post_ids = 1;
  repeated string up_to_date_post_ids = 2;
  repeated string unknown_post_ids = 3;
}
```

- [ ] **Step 2: Commit**

```bash
git add proto/
git commit -m "feat: add shared proto definition for ConfigSync gRPC service"
```

---

## Phase 2: 数据库模型 & 迁移

### Task 2.1: SQLAlchemy 模型

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/post.py`
- Create: `backend/app/models/image.py`
- Create: `backend/app/models/collection.py`
- Create: `backend/app/models/like.py`

- [ ] **Step 1: 创建 backend/app/models/user.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class OAuthProvider(str, enum.Enum):
    github = "github"
    gitee = "gitee"
    gitcode = "gitcode"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    avatar_url: Mapped[str] = mapped_column(String(512), default="")
    oauth_provider: Mapped[OAuthProvider] = mapped_column(SAEnum(OAuthProvider), nullable=False)
    oauth_id: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    posts = relationship("Post", back_populates="author")
    collections = relationship("Collection", back_populates="user")
    likes = relationship("Like", back_populates="user")
```

- [ ] **Step 2: 创建 backend/app/models/post.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from app.database import Base
import enum


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
    config_files: Mapped[dict] = mapped_column(JSONB, default=list)
    category: Mapped[PostCategory] = mapped_column(default=PostCategory.other)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    likes_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    author = relationship("User", back_populates="posts")
    images = relationship("Image", back_populates="post", order_by="Image.sort_order")
    likes = relationship("Like", back_populates="post")
```

- [ ] **Step 3: 创建 backend/app/models/image.py**

```python
import uuid
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Image(Base):
    __tablename__ = "images"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    url_original: Mapped[str] = mapped_column(String(512), nullable=False)
    url_600: Mapped[str] = mapped_column(String(512), nullable=False)
    url_300: Mapped[str] = mapped_column(String(512), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    post = relationship("Post", back_populates="images")
```

- [ ] **Step 4: 创建 backend/app/models/collection.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Table, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


collection_post = Table(
    "collection_post",
    Base.metadata,
    mapped_column("collection_id", UUID(as_uuid=True), ForeignKey("collections.id", ondelete="CASCADE"), primary_key=True),
    mapped_column("post_id", UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    mapped_column("added_at", DateTime(timezone=True), server_default=func.now()),
)


class Collection(Base):
    __tablename__ = "collections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(String(512), default="")
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    is_subscribed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="collections")
    posts = relationship("Post", secondary=collection_post, lazy="selectin")
```

- [ ] **Step 5: 创建 backend/app/models/like.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Like(Base):
    __tablename__ = "likes"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="likes")
    post = relationship("Post", back_populates="likes")
```

- [ ] **Step 6: 创建 backend/app/models/__init__.py**

```python
from app.models.user import User, OAuthProvider
from app.models.post import Post, PostCategory
from app.models.image import Image
from app.models.collection import Collection, collection_post
from app.models.like import Like

__all__ = [
    "User", "OAuthProvider",
    "Post", "PostCategory",
    "Image",
    "Collection", "collection_post",
    "Like",
]
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/
git commit -m "feat: SQLAlchemy models — User, Post, Image, Collection, Like"
```

---

### Task 2.2: Alembic 迁移

- [ ] **Step 1: 初始化 Alembic**

```bash
cd backend
alembic init migrations
```

- [ ] **Step 2: 配置 alembic.ini 和 env.py**

修改 `backend/alembic.ini` 中的 `sqlalchemy.url`:
```ini
sqlalchemy.url = postgresql+asyncpg://lain42:lain42@localhost:5432/lain42
```

编辑 `backend/migrations/env.py` — 添加异步支持：
```python
import asyncio
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context
from app.database import Base
from app.models import *  # noqa — 确保所有模型被导入

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online():
    connectable = create_async_engine(config.get_main_option("sqlalchemy.url"))
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

- [ ] **Step 3: 生成迁移并验证**

```bash
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

- [ ] **Step 4: Commit**

```bash
git add backend/alembic.ini backend/migrations/
git commit -m "feat: add Alembic migrations for initial schema"
```

---

## Phase 3: 认证系统

### Task 3.1: JWT 工具 & OAuth Provider 抽象

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/auth.py`
- Create: `backend/app/services/oauth.py`

- [ ] **Step 1: 创建 backend/app/services/auth.py — JWT 工具**

```python
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from app.config import get_settings

settings = get_settings()


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire, "type": "access"},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire, "type": "refresh"},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_token(token: str) -> dict:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    return payload


def get_user_id_from_token(token: str) -> str:
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise ValueError("Invalid token type")
    return payload["sub"]
```

- [ ] **Step 2: 创建 backend/app/services/oauth.py — OAuth Provider 抽象**

```python
from dataclasses import dataclass
import httpx
from app.config import get_settings

settings = get_settings()


@dataclass
class OAuthUser:
    oauth_id: str
    username: str
    display_name: str
    avatar_url: str
    email: str


class OAuthProviderBase:
    provider: str = ""
    authorize_url: str = ""
    token_url: str = ""
    userinfo_url: str = ""

    async def get_access_token(self, code: str) -> str:
        raise NotImplementedError

    async def get_user_info(self, access_token: str) -> OAuthUser:
        raise NotImplementedError

    async def authenticate(self, code: str) -> OAuthUser:
        token = await self.get_access_token(code)
        return await self.get_user_info(token)


class GitHubOAuth(OAuthProviderBase):
    provider = "github"
    authorize_url = "https://github.com/login/oauth/authorize"
    token_url = "https://github.com/login/oauth/access_token"
    userinfo_url = "https://api.github.com/user"

    async def get_access_token(self, code: str) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.token_url,
                json={
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "code": code,
                },
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            return resp.json()["access_token"]

    async def get_user_info(self, access_token: str) -> OAuthUser:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self.userinfo_url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            return OAuthUser(
                oauth_id=str(data["id"]),
                username=data["login"],
                display_name=data.get("name") or data["login"],
                avatar_url=data.get("avatar_url", ""),
                email=data.get("email", ""),
            )


class GiteeOAuth(OAuthProviderBase):
    provider = "gitee"
    authorize_url = "https://gitee.com/oauth/authorize"
    token_url = "https://gitee.com/oauth/token"
    userinfo_url = "https://gitee.com/api/v5/user"

    async def get_access_token(self, code: str) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.token_url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": settings.gitee_client_id,
                    "client_secret": settings.gitee_client_secret,
                    "redirect_uri": settings.gitee_redirect_uri,
                },
            )
            resp.raise_for_status()
            return resp.json()["access_token"]

    async def get_user_info(self, access_token: str) -> OAuthUser:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self.userinfo_url,
                params={"access_token": access_token},
            )
            resp.raise_for_status()
            data = resp.json()
            return OAuthUser(
                oauth_id=str(data["id"]),
                username=data["login"],
                display_name=data.get("name") or data["login"],
                avatar_url=data.get("avatar_url", ""),
                email=data.get("email", ""),
            )


class GitCodeOAuth(OAuthProviderBase):
    provider = "gitcode"
    authorize_url = "https://gitcode.com/oauth/authorize"
    token_url = "https://gitcode.com/oauth/token"
    userinfo_url = "https://gitcode.com/api/v5/user"

    async def get_access_token(self, code: str) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.token_url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": settings.gitcode_client_id,
                    "client_secret": settings.gitcode_client_secret,
                    "redirect_uri": settings.gitcode_redirect_uri,
                },
            )
            resp.raise_for_status()
            return resp.json()["access_token"]

    async def get_user_info(self, access_token: str) -> OAuthUser:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self.userinfo_url,
                params={"access_token": access_token},
            )
            resp.raise_for_status()
            data = resp.json()
            return OAuthUser(
                oauth_id=str(data["id"]),
                username=data["username"],
                display_name=data.get("nickname") or data["username"],
                avatar_url=data.get("avatar_url", ""),
                email=data.get("email", ""),
            )


PROVIDERS: dict[str, OAuthProviderBase] = {
    "github": GitHubOAuth(),
    "gitee": GiteeOAuth(),
    "gitcode": GitCodeOAuth(),
}


def get_provider(name: str) -> OAuthProviderBase:
    provider = PROVIDERS.get(name)
    if not provider:
        raise ValueError(f"Unknown OAuth provider: {name}")
    return provider
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/
git commit -m "feat: JWT utils and OAuth provider abstraction (GitHub/Gitee/GitCode)"
```

---

### Task 3.2: Auth API 端点

**Files:**
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/auth.py`
- Create: `backend/app/api/deps.py`

- [ ] **Step 1: 创建 backend/app/schemas/auth.py**

```python
from pydantic import BaseModel


class OAuthLoginRequest(BaseModel):
    provider: str
    code: str
    redirect_uri: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: str

    model_config = {"from_attributes": True}


class OAuthProviderInfo(BaseModel):
    provider: str
    name: str
    client_id: str
    authorize_url: str
```

- [ ] **Step 2: 创建 backend/app/api/deps.py — 依赖注入**

```python
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User
from app.services.auth import get_user_id_from_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        user_id = get_user_id_from_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = await db.get(User, UUID(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        user_id = get_user_id_from_token(credentials.credentials)
        return await db.get(User, UUID(user_id))
    except Exception:
        return None
```

- [ ] **Step 3: 创建 backend/app/api/auth.py**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError
from app.database import get_db
from app.models import User, OAuthProvider
from app.schemas.auth import (
    OAuthLoginRequest,
    TokenResponse,
    RefreshRequest,
    UserResponse,
    OAuthProviderInfo,
)
from app.services.auth import create_access_token, create_refresh_token, decode_token
from app.services.oauth import get_provider
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/providers", response_model=list[OAuthProviderInfo])
async def list_providers():
    from app.config import get_settings
    s = get_settings()
    return [
        OAuthProviderInfo(
            provider="github",
            name="GitHub",
            client_id=s.github_client_id,
            authorize_url="https://github.com/login/oauth/authorize",
        ),
        OAuthProviderInfo(
            provider="gitee",
            name="Gitee",
            client_id=s.gitee_client_id,
            authorize_url="https://gitee.com/oauth/authorize",
        ),
        OAuthProviderInfo(
            provider="gitcode",
            name="GitCode",
            client_id=s.gitcode_client_id,
            authorize_url="https://gitcode.com/oauth/authorize",
        ),
    ]


@router.post("/login", response_model=TokenResponse)
async def oauth_login(body: OAuthLoginRequest, db: AsyncSession = Depends(get_db)):
    provider = get_provider(body.provider)
    oauth_user = await provider.authenticate(body.code)

    # 查找或创建用户
    result = await db.execute(
        select(User).where(
            User.oauth_provider == OAuthProvider(body.provider),
            User.oauth_id == oauth_user.oauth_id,
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        # 处理用户名冲突
        base_username = oauth_user.username
        username = base_username
        counter = 1
        while True:
            existing = await db.execute(select(User).where(User.username == username))
            if not existing.scalar_one_or_none():
                break
            username = f"{base_username}{counter}"
            counter += 1

        user = User(
            username=username,
            display_name=oauth_user.display_name,
            avatar_url=oauth_user.avatar_url,
            oauth_provider=OAuthProvider(body.provider),
            oauth_id=oauth_user.oauth_id,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload["sub"]
    new_access = create_access_token(user_id)
    new_refresh = create_refresh_token(user_id)
    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return user
```

- [ ] **Step 4: 注册路由到 main.py**

修改 `backend/app/main.py`：
```python
from app.api.auth import router as auth_router

# 在 lifespan 之后添加:
app.include_router(auth_router, prefix="/api")
```

- [ ] **Step 5: 测试 OAuth 流程**

```bash
# 启动服务
fastapi dev app/main.py

# 获取 OAuth 提供商列表
curl http://localhost:8000/api/auth/providers
# 预期: [{provider信息}, ...]
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/ backend/app/api/ backend/app/main.py
git commit -m "feat: OAuth login with GitHub/Gitee/GitCode + JWT tokens"
```

---

## Phase 4: 帖子 & 图片 & 搜索 API

### Task 4.1: 帖子 CRUD API

**Files:**
- Create: `backend/app/schemas/post.py`
- Create: `backend/app/api/posts.py`

- [ ] **Step 1: 创建 backend/app/schemas/post.py**

```python
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
    image_ids: list[uuid.UUID] = []  # 已上传的图片 ID


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


class PostListResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    cover_image: str
    category: str
    tags: list[str]
    author: "AuthorBrief"
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
    author: "AuthorBrief"
    images: list[ImageResponse]
    likes_count: int
    created_at: datetime
    updated_at: datetime
    is_liked: bool = False

    model_config = {"from_attributes": True}


class AuthorBrief(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str
    avatar_url: str

    model_config = {"from_attributes": True}


class PostListPage(BaseModel):
    items: list[PostListResponse]
    total: int
    page: int
    per_page: int
```

- [ ] **Step 2: 创建 backend/app/api/posts.py**

```python
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import joinedload, selectinload
from app.database import get_db
from app.models import Post, Image, Like
from app.models.post import PostCategory
from app.schemas.post import (
    PostCreate, PostUpdate, PostListResponse, PostDetailResponse, PostListPage,
)
from app.api.deps import get_current_user, get_optional_user
from app.models.user import User

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("", response_model=PostListPage)
async def list_posts(
    category: str | None = Query(None),
    tag: str | None = Query(None),
    sort: str = Query("latest", pattern="^(latest|popular)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page

    # 基础查询
    query = select(Post).options(joinedload(Post.author))

    if category:
        query = query.where(Post.category == PostCategory(category))
    if tag:
        query = query.where(Post.tags.any(tag))

    # 排序
    if sort == "popular":
        query = query.order_by(Post.likes_count.desc(), Post.created_at.desc())
    else:
        query = query.order_by(Post.created_at.desc())

    # 总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 分页
    query = query.offset(offset).limit(per_page)
    result = await db.execute(query)
    posts = result.unique().scalars().all()

    items = [PostListResponse.model_validate(p) for p in posts]
    return PostListPage(items=items, total=total, page=page, per_page=per_page)


@router.get("/{post_id}", response_model=PostDetailResponse)
async def get_post(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    result = await db.execute(
        select(Post)
        .options(joinedload(Post.author), selectinload(Post.images))
        .where(Post.id == post_id)
    )
    post = result.unique().scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    is_liked = False
    if current_user:
        like_result = await db.execute(
            select(Like).where(Like.user_id == current_user.id, Like.post_id == post_id)
        )
        is_liked = like_result.scalar_one_or_none() is not None

    response = PostDetailResponse.model_validate(post)
    response.is_liked = is_liked
    return response


@router.post("", response_model=PostDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    body: PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 验证 category
    if body.category not in [c.value for c in PostCategory]:
        raise HTTPException(status_code=400, detail=f"Invalid category: {body.category}")

    # 设置封面图为第一张上传的图片
    cover_image = ""
    if body.image_ids:
        first_image = await db.get(Image, body.image_ids[0])
        if first_image:
            cover_image = first_image.url_600

    post = Post(
        title=body.title,
        description=body.description,
        content=body.content,
        config_files=[cf.model_dump() for cf in body.config_files],
        category=PostCategory(body.category),
        tags=body.tags,
        cover_image=cover_image,
        author_id=current_user.id,
    )
    db.add(post)
    await db.flush()

    # 关联图片
    if body.image_ids:
        for idx, image_id in enumerate(body.image_ids):
            img = await db.get(Image, image_id)
            if img:
                img.post_id = post.id
                img.sort_order = idx

    await db.commit()
    await db.refresh(post)

    # 重新查询带回关联数据
    result = await db.execute(
        select(Post)
        .options(joinedload(Post.author), selectinload(Post.images))
        .where(Post.id == post.id)
    )
    post = result.unique().scalar_one()
    return PostDetailResponse.model_validate(post)


@router.put("/{post_id}", response_model=PostDetailResponse)
async def update_post(
    post_id: UUID,
    body: PostUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Post).options(selectinload(Post.images)).where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your post")

    update_data = body.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        if key == "image_ids":
            # 重新关联图片
            for idx, img_id in enumerate(val):
                img = await db.get(Image, img_id)
                if img:
                    img.post_id = post.id
                    img.sort_order = idx
        elif key == "config_files" and val is not None:
            setattr(post, key, [cf if isinstance(cf, dict) else cf.model_dump() for cf in val])
        elif hasattr(post, key):
            setattr(post, key, val)

    await db.commit()
    await db.refresh(post)
    return PostDetailResponse.model_validate(post)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your post")

    await db.delete(post)
    await db.commit()
```

- [ ] **Step 3: 注册路由**

修改 `backend/app/main.py`:
```python
from app.api.posts import router as posts_router
app.include_router(posts_router, prefix="/api")
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/schemas/post.py backend/app/api/posts.py backend/app/main.py
git commit -m "feat: Posts CRUD API with list/detail/create/update/delete"
```

---

### Task 4.2: 图片上传 API

**Files:**
- Create: `backend/app/api/upload.py`
- Create: `backend/app/services/upload.py`

- [ ] **Step 1: 创建 backend/app/services/upload.py**

```python
import uuid
from pathlib import Path
from PIL import Image as PILImage
from app.config import get_settings

settings = get_settings()


def process_image(file_path: Path, post_id: str) -> dict:
    """处理图片：生成 3 级 WebP 缩略图，返回 URLs 字典。
    返回: {"original": url, "600": url, "300": url}
    """
    base_dir = Path(settings.upload_dir) / post_id
    base_dir.mkdir(parents=True, exist_ok=True)

    base_name = uuid.uuid4().hex[:12]
    img = PILImage.open(file_path)

    # 转 RGB（处理 RGBA/PNG）
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    def save_resized(size: int) -> str:
        filename = f"{base_name}_{size}.webp"
        output = base_dir / filename
        img_copy = img.copy()
        img_copy.thumbnail((size, size))
        img_copy.save(output, "WEBP", quality=85)
        return f"/images/{post_id}/{filename}"

    # 原始尺寸 WebP
    original_filename = f"{base_name}_original.webp"
    original_path = base_dir / original_filename
    img.save(original_path, "WEBP", quality=85)

    return {
        "original": f"/images/{post_id}/{original_filename}",
        "600": save_resized(600),
        "300": save_resized(300),
    }
```

- [ ] **Step 2: 创建 backend/app/api/upload.py**

```python
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Image
from app.models.user import User
from app.api.deps import get_current_user
from app.services.upload import process_image
from app.config import get_settings
import aiofiles
from pathlib import Path

settings = get_settings()
router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 验证类型
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(400, f"Unsupported type: {file.content_type}")

    # 验证大小
    content = await file.read()
    max_bytes = settings.max_image_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(400, f"File exceeds {settings.max_image_size_mb}MB limit")

    # 保存临时文件
    tmp_dir = Path(settings.upload_dir) / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    tmp_path = tmp_dir / f"{uuid.uuid4().hex}.tmp"
    async with aiofiles.open(tmp_path, "wb") as f:
        await f.write(content)

    # 处理图片
    try:
        urls = process_image(tmp_path, "tmp")
    except Exception as e:
        raise HTTPException(400, f"Image processing failed: {e}")
    finally:
        tmp_path.unlink(missing_ok=True)

    # 创建 Image 记录（暂未关联 post）
    image = Image(
        url_original=urls["original"],
        url_600=urls["600"],
        url_300=urls["300"],
    )
    db.add(image)
    await db.commit()
    await db.refresh(image)

    return {
        "id": str(image.id),
        "url_original": image.url_original,
        "url_600": image.url_600,
        "url_300": image.url_300,
    }
```

- [ ] **Step 3: 注册路由**

```python
# backend/app/main.py
from app.api.upload import router as upload_router
app.include_router(upload_router, prefix="/api")
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/upload.py backend/app/api/upload.py backend/app/main.py
git commit -m "feat: image upload with Pillow WebP compression (300/600/original)"
```

---

### Task 4.3: 点赞 & 收藏夹 & 搜索 API

**Files:**
- Create: `backend/app/schemas/collection.py`
- Create: `backend/app/api/likes.py`
- Create: `backend/app/api/collections.py`
- Create: `backend/app/api/search.py`

- [ ] **Step 1: 创建 backend/app/schemas/collection.py**

```python
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
```

- [ ] **Step 2: 创建 backend/app/api/likes.py**

```python
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models import Like, Post
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/posts", tags=["likes"])


@router.post("/{post_id}/like")
async def toggle_like(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 检查帖子存在
    post = await db.get(Post, post_id)
    if not post:
        from fastapi import HTTPException
        raise HTTPException(404, "Post not found")

    # 检查是否已点赞
    result = await db.execute(
        select(Like).where(Like.user_id == current_user.id, Like.post_id == post_id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        await db.execute(
            update(Post).where(Post.id == post_id).values(likes_count=Post.likes_count - 1)
        )
        await db.commit()
        return {"liked": False, "likes_count": post.likes_count - 1}
    else:
        like = Like(user_id=current_user.id, post_id=post_id)
        db.add(like)
        await db.execute(
            update(Post).where(Post.id == post_id).values(likes_count=Post.likes_count + 1)
        )
        await db.commit()
        return {"liked": True, "likes_count": post.likes_count + 1}
```

- [ ] **Step 3: 创建 backend/app/api/collections.py**

```python
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Collection, Post, collection_post
from app.models.user import User
from app.schemas.collection import CollectionCreate, CollectionUpdate, CollectionResponse
from app.schemas.post import PostListResponse
from app.api.deps import get_current_user, get_optional_user

router = APIRouter(tags=["collections"])


@router.get("/collections", response_model=list[CollectionResponse])
async def list_my_collections(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Collection)
        .options(selectinload(Collection.posts))
        .where(Collection.user_id == current_user.id)
        .order_by(Collection.created_at.desc())
    )
    collections = result.unique().scalars().all()
    return [
        CollectionResponse(
            id=c.id,
            name=c.name,
            description=c.description,
            is_public=c.is_public,
            is_subscribed=c.is_subscribed,
            post_count=len(c.posts),
            created_at=c.created_at,
        )
        for c in collections
    ]


@router.post("/collections", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_collection(
    body: CollectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    col = Collection(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        is_public=body.is_public,
        is_subscribed=body.is_subscribed,
    )
    db.add(col)
    await db.commit()
    await db.refresh(col)
    return CollectionResponse(
        id=col.id, name=col.name, description=col.description,
        is_public=col.is_public, is_subscribed=col.is_subscribed,
        post_count=0, created_at=col.created_at,
    )


@router.put("/collections/{col_id}", response_model=CollectionResponse)
async def update_collection(
    col_id: UUID,
    body: CollectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    col = await db.get(Collection, col_id)
    if not col or col.user_id != current_user.id:
        raise HTTPException(404, "Collection not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(col, key, val)
    await db.commit()
    await db.refresh(col)

    await db.refresh(col, ["posts"])
    return CollectionResponse(
        id=col.id, name=col.name, description=col.description,
        is_public=col.is_public, is_subscribed=col.is_subscribed,
        post_count=len(col.posts), created_at=col.created_at,
    )


@router.get("/users/{username}/collections", response_model=list[CollectionResponse])
async def list_user_collections(
    username: str,
    db: AsyncSession = Depends(get_db),
):
    user_result = await db.execute(select(User).where(User.username == username))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    result = await db.execute(
        select(Collection)
        .options(selectinload(Collection.posts))
        .where(Collection.user_id == user.id, Collection.is_public == True)
        .order_by(Collection.created_at.desc())
    )
    collections = result.unique().scalars().all()
    return [
        CollectionResponse(
            id=c.id, name=c.name, description=c.description,
            is_public=c.is_public, is_subscribed=c.is_subscribed,
            post_count=len(c.posts), created_at=c.created_at,
        )
        for c in collections
    ]


@router.post("/collections/{col_id}/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def add_post_to_collection(
    col_id: UUID,
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    col = await db.get(Collection, col_id)
    if not col or col.user_id != current_user.id:
        raise HTTPException(404, "Collection not found")

    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Post not found")

    await db.execute(
        collection_post.insert().values(collection_id=col_id, post_id=post_id)
    )
    await db.commit()


@router.delete("/collections/{col_id}/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_post_from_collection(
    col_id: UUID,
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    col = await db.get(Collection, col_id)
    if not col or col.user_id != current_user.id:
        raise HTTPException(404, "Collection not found")

    await db.execute(
        collection_post.delete().where(
            collection_post.c.collection_id == col_id,
            collection_post.c.post_id == post_id,
        )
    )
    await db.commit()
```

- [ ] **Step 4: 创建 backend/app/api/search.py**

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from sqlalchemy.orm import joinedload
from app.database import get_db
from app.models import Post
from app.models.post import PostCategory
from app.schemas.post import PostListPage, PostListResponse

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=PostListPage)
async def search(
    q: str = Query(..., min_length=1),
    category: str | None = Query(None),
    sort: str = Query("latest", pattern="^(latest|popular)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page

    # 简单文本搜索 (生产环境建议加 pg_jieba 或 tsvector)
    search_term = f"%{q}%"
    query = (
        select(Post)
        .options(joinedload(Post.author))
        .where(
            Post.title.ilike(search_term)
            | Post.description.ilike(search_term)
            | Post.content.ilike(search_term)
        )
    )

    if category:
        query = query.where(Post.category == PostCategory(category))

    if sort == "popular":
        query = query.order_by(Post.likes_count.desc(), Post.created_at.desc())
    else:
        query = query.order_by(Post.created_at.desc())

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Page
    query = query.offset(offset).limit(per_page)
    result = await db.execute(query)
    posts = result.unique().scalars().all()

    items = [PostListResponse.model_validate(p) for p in posts]
    return PostListPage(items=items, total=total, page=page, per_page=per_page)
```

- [ ] **Step 5: 注册所有新路由**

```python
# backend/app/main.py
from app.api.likes import router as likes_router
from app.api.collections import router as collections_router
from app.api.search import router as search_router

app.include_router(likes_router, prefix="/api")
app.include_router(collections_router, prefix="/api")
app.include_router(search_router, prefix="/api")
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/collection.py backend/app/api/likes.py backend/app/api/collections.py backend/app/api/search.py backend/app/main.py
git commit -m "feat: likes, collections CRUD, and search API endpoints"
```

---

### Task 4.4: 用户 API (个人主页)

**Files:**
- Create: `backend/app/api/users.py`

- [ ] **Step 1: 创建 backend/app/api/users.py**

```python
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from app.database import get_db
from app.models import User, Post
from app.schemas.post import PostListResponse
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{username}", response_model=UserResponse)
async def get_user(username: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.get("/{username}/posts", response_model=list[PostListResponse])
async def get_user_posts(
    username: str,
    page: int = 1,
    per_page: int = 20,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    offset = (page - 1) * per_page
    posts_result = await db.execute(
        select(Post)
        .options(joinedload(Post.author))
        .where(Post.author_id == user.id)
        .order_by(Post.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    posts = posts_result.unique().scalars().all()
    return [PostListResponse.model_validate(p) for p in posts]
```

- [ ] **Step 2: 注册路由**

```python
# backend/app/main.py
from app.api.users import router as users_router
app.include_router(users_router, prefix="/api")
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/users.py backend/app/main.py
git commit -m "feat: user profile and user-posts API"
```

---

## Phase 5: 前端 SPA 页面

### Task 5.1: 前端类型定义 & 共享组件

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/components/Navbar.tsx`
- Create: `frontend/src/components/ConfigCard.tsx`
- Create: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: 创建 frontend/src/types/index.ts**

```typescript
export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

export interface AuthorBrief {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

export interface PostListItem {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  category: string;
  tags: string[];
  author: AuthorBrief;
  likes_count: number;
  created_at: string;
}

export interface ImageItem {
  id: string;
  url_original: string;
  url_600: string;
  url_300: string;
}

export interface PostDetail {
  id: string;
  title: string;
  description: string;
  content: string;
  cover_image: string;
  config_files: { path: string; content: string; language: string }[];
  category: string;
  tags: string[];
  author: AuthorBrief;
  images: ImageItem[];
  likes_count: number;
  created_at: string;
  updated_at: string;
  is_liked: boolean;
}

export interface PostListPage {
  items: PostListItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  is_subscribed: boolean;
  post_count: number;
  created_at: string;
}

export const CATEGORIES: Record<string, string> = {
  software: "开源/小众软件",
  desktop: "桌面美化/Ricing",
  "dev-env": "开发环境",
  terminal: "终端配置",
  editor: "编辑器配置",
  system: "系统配置",
  "book-source": "书源/阅读源",
  other: "其他",
};
```

- [ ] **Step 2: 创建 frontend/src/components/Navbar.tsx**

```tsx
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth";
import { useState } from "react";
import { Plus } from "lucide-react";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4 max-w-[1600px] mx-auto">
        <Link to="/" className="text-xl font-bold shrink-0">
          Lain42
        </Link>

        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <Input
            placeholder="搜索配置..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
          />
        </form>

        <div className="flex items-center gap-3 ml-auto">
          {isAuthenticated ? (
            <>
              <Button size="sm" variant="outline" onClick={() => navigate("/publish")}>
                <Plus className="h-4 w-4 mr-1" />
                发布
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback>{user?.display_name?.[0]}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/user/${user?.username}`)}>
                    我的主页
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    设置
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>退出</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate("/login")}>
              登录
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: 创建 frontend/src/components/ConfigCard.tsx**

```tsx
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";
import type { PostListItem } from "@/types";

export default function ConfigCard({ post }: { post: PostListItem }) {
  return (
    <Link to={`/post/${post.id}`}>
      <Card className="overflow-hidden break-inside-avoid mb-4 group hover:shadow-md transition-shadow">
        {post.cover_image ? (
          <img
            src={post.cover_image}
            alt={post.title}
            loading="lazy"
            className="w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-40 bg-muted flex items-center justify-center text-muted-foreground">
            无封面图
          </div>
        )}
        <div className="p-3">
          <h3 className="font-semibold text-sm line-clamp-2 mb-1">{post.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {post.description}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={post.author.avatar_url} />
                <AvatarFallback className="text-[10px]">
                  {post.author.display_name[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {post.author.display_name}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Heart className="h-3 w-3" />
              {post.likes_count}
            </div>
          </div>
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 4: Create frontend/src/components/Layout.tsx**

```tsx
import Navbar from "./Navbar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/ frontend/src/components/
git commit -m "feat: frontend types, Navbar, ConfigCard, Layout components"
```

---

### Task 5.2: 首页瀑布流

**Files:**
- Create: `frontend/src/pages/HomePage.tsx`

- [ ] **Step 1: 创建 frontend/src/pages/HomePage.tsx**

```tsx
import { useInfiniteQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import ConfigCard from "@/components/ConfigCard";
import { CATEGORIES } from "@/types";
import type { PostListItem, PostListPage } from "@/types";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useCallback, useRef } from "react";

export default function HomePage() {
  const { slug: categorySlug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const tag = searchParams.get("tag") || undefined;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["posts", categorySlug, tag],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.set("page", String(pageParam));
      params.set("per_page", "20");
      if (categorySlug) params.set("category", categorySlug);
      if (tag) params.set("tag", tag);
      return api.get<PostListPage>(`/posts?${params}`);
    },
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.page + 1;
      return nextPage * lastPage.per_page < lastPage.total ? nextPage : undefined;
    },
    initialPageParam: 1,
  });

  const observer = useRef<IntersectionObserver>();
  const lastCardRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  const allPosts: PostListItem[] = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-4 py-4">
        {/* Category Tabs */}
        <Tabs value={categorySlug || "all"} className="mb-6">
          <ScrollArea>
            <TabsList className="h-9">
              <TabsTrigger value="all" onClick={() => window.location.href = "/"}>
                全部
              </TabsTrigger>
              {Object.entries(CATEGORIES).map(([key, label]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  onClick={() => {
                    window.location.href = `/category/${key}`;
                  }}
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Tabs>

        {tag && (
          <div className="mb-4 text-sm text-muted-foreground">
            标签: <span className="font-medium text-foreground">{tag}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : allPosts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            暂无配置分享
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4">
            {allPosts.map((post, index) => (
              <div
                key={post.id}
                ref={index === allPosts.length - 5 ? lastCardRef : undefined}
              >
                <ConfigCard post={post} />
              </div>
            ))}
          </div>
        )}

        {isFetchingNextPage && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/HomePage.tsx
git commit -m "feat: homepage masonry feed with infinite scroll and category tabs"
```

---

### Task 5.3: 登录页面

**Files:**
- Create: `frontend/src/pages/LoginPage.tsx`

- [ ] **Step 1: 创建 frontend/src/pages/LoginPage.tsx**

```tsx
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";

const PROVIDERS = [
  {
    provider: "github",
    name: "GitHub",
    clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || "",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    color: "bg-gray-900 hover:bg-gray-800",
  },
  {
    provider: "gitee",
    name: "Gitee",
    clientId: import.meta.env.VITE_GITEE_CLIENT_ID || "",
    authorizeUrl: "https://gitee.com/oauth/authorize",
    color: "bg-red-600 hover:bg-red-500",
  },
  {
    provider: "gitcode",
    name: "GitCode",
    clientId: import.meta.env.VITE_GITCODE_CLIENT_ID || "",
    authorizeUrl: "https://gitcode.com/oauth/authorize",
    color: "bg-blue-600 hover:bg-blue-500",
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated } = useAuthStore();

  // OAuth 回调处理
  useEffect(() => {
    const code = searchParams.get("code");
    const provider = searchParams.get("provider");
    if (code && provider) {
      login(provider, code).then(() => navigate("/"));
    }
  }, [searchParams, login, navigate]);

  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleLogin = (provider: string, authorizeUrl: string, clientId: string) => {
    const redirectUri = `${window.location.origin}/login/callback?provider=${provider}`;
    const url = `${authorizeUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user`;
    window.location.href = url;
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">登录 Lain42</CardTitle>
            <CardDescription>选择一种方式登录，分享你的配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {PROVIDERS.map((p) =>
              p.clientId ? (
                <Button
                  key={p.provider}
                  className={`w-full text-white ${p.color}`}
                  onClick={() => handleLogin(p.provider, p.authorizeUrl, p.clientId)}
                >
                  使用 {p.name} 登录
                </Button>
              ) : null
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx
git commit -m "feat: OAuth login page with GitHub/Gitee/GitCode"
```

---

### Task 5.4: 帖子详情页

**Files:**
- Create: `frontend/src/pages/PostDetailPage.tsx`

- [ ] **Step 1: 创建 frontend/src/pages/PostDetailPage.tsx**（配置预览 + Markdown + 图片轮播 + 点赞收藏按钮）

```tsx
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Heart, Bookmark, Copy, Check } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { useAuthStore } from "@/stores/auth";
import type { PostDetail } from "@/types";
import { CATEGORIES } from "@/types";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuthStore();
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: () => api.get<PostDetail>(`/posts/${id}`),
    enabled: !!id,
  });

  const handleLike = async () => {
    if (!isAuthenticated) return;
    await api.post(`/posts/${id}/like`);
  };

  const copyContent = (content: string, path: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(path);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  if (isLoading) return <Layout><div className="flex justify-center py-20">加载中...</div></Layout>;
  if (!post) return <Layout><div className="text-center py-20">帖子不存在</div></Layout>;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Badge variant="outline" className="mb-2">
            {CATEGORIES[post.category] || post.category}
          </Badge>
          <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
          <p className="text-muted-foreground mb-4">{post.description}</p>

          <div className="flex items-center gap-3">
            <Link to={`/user/${post.author.username}`} className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.author.avatar_url} />
                <AvatarFallback>{post.author.display_name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{post.author.display_name}</span>
            </Link>
            <span className="text-sm text-muted-foreground">
              {new Date(post.created_at).toLocaleDateString("zh-CN")}
            </span>
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              variant={post.is_liked ? "default" : "outline"}
              size="sm"
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 mr-1 ${post.is_liked ? "fill-current" : ""}`} />
              {post.likes_count}
            </Button>
            <Button variant="outline" size="sm">
              <Bookmark className="h-4 w-4 mr-1" />
              收藏
            </Button>
          </div>
        </div>

        <Separator className="mb-6" />

        {/* Images */}
        {post.images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {post.images.map((img) => (
              <img
                key={img.id}
                src={img.url_600}
                alt=""
                className="rounded-lg object-cover w-full cursor-pointer hover:opacity-90"
                onClick={() => window.open(img.url_original, "_blank")}
              />
            ))}
          </div>
        )}

        {/* Config Files */}
        {post.config_files.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3">配置文件</h2>
            <div className="space-y-3">
              {post.config_files.map((file, idx) => (
                <Card key={idx}>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between px-4 py-2 bg-muted rounded-t-lg">
                      <code className="text-sm">{file.path}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyContent(file.content, file.path)}
                      >
                        {copiedFile === file.path ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-sm">
                      <code>{file.content}</code>
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map((tag) => (
              <Link to={`/tag/${tag}`} key={tag}>
                <Badge variant="secondary">{tag}</Badge>
              </Link>
            ))}
          </div>
        )}

        <Separator className="mb-8" />

        {/* Markdown Content */}
        {post.content && (
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]} remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/PostDetailPage.tsx
git commit -m "feat: post detail page with images, config files, markdown, like"
```

---

### Task 5.5: 发布/编辑页面

**Files:**
- Create: `frontend/src/pages/PublishPage.tsx`

- [ ] **Step 1: 创建 frontend/src/pages/PublishPage.tsx** — 带图片上传、Markdown 编辑、Monaco 配置文件编辑

```tsx
import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, Plus, Trash2, Upload } from "lucide-react";
import Editor from "@monaco-editor/react";
import { CATEGORIES } from "@/types";
import type { PostDetail, ImageItem } from "@/types";

export default function PublishPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("other");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [configFiles, setConfigFiles] = useState<
    { path: string; content: string; language: string }[]
  >([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);

  // Load existing post for editing
  const { data: existingPost } = useQuery({
    queryKey: ["post", id],
    queryFn: () => api.get<PostDetail>(`/posts/${id}`),
    enabled: isEdit,
  });

  // Initialize form state from existing post when editing
  useEffect(() => {
    if (existingPost) {
      setTitle(existingPost.title);
      setDescription(existingPost.description);
      setContent(existingPost.content);
      setCategory(existingPost.category);
      setTags(existingPost.tags);
      setConfigFiles(existingPost.config_files);
      setImages(existingPost.images);
    }
  }, [existingPost]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      const result = await api.post<ImageItem>("/upload/image", formData);
      setImages((prev) => [...prev, result]);
    }
    setUploading(false);
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
    }
    setTagInput("");
  };

  const addConfigFile = () => {
    setConfigFiles([...configFiles, { path: "", content: "", language: "plaintext" }]);
  };

  const updateConfigFile = (idx: number, field: string, value: string) => {
    const updated = [...configFiles];
    (updated[idx] as any)[field] = value;
    setConfigFiles(updated);
  };

  const removeConfigFile = (idx: number) => {
    setConfigFiles(configFiles.filter((_, i) => i !== idx));
  };

  const publishMutation = useMutation({
    mutationFn: (data: any) =>
      isEdit ? api.put(`/posts/${id}`, data) : api.post("/posts", data),
    onSuccess: (result: any) => {
      navigate(`/post/${result.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    publishMutation.mutate({
      title,
      description,
      content,
      category,
      tags,
      config_files: configFiles,
      image_ids: images.map((img) => img.id),
    });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">{isEdit ? "编辑" : "发布"}配置</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <Label>标题</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          {/* Description */}
          <div>
            <Label>简短描述</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Category */}
          <div>
            <Label>分类</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <Label>标签</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="输入标签后回车"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                添加
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((tag) => (
                <Badge key={tag} className="gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <Label>截图/图片 (最多5张)</Label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-2">
              {images.map((img, idx) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.url_300}
                    alt=""
                    className="rounded-lg object-cover w-full aspect-square"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => setImages(images.filter((_, i) => i !== idx))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="border-2 border-dashed rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-primary">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">
                    {uploading ? "上传中..." : "上传图片"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Config Files */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>配置文件</Label>
              <Button type="button" variant="outline" size="sm" onClick={addConfigFile}>
                <Plus className="h-4 w-4 mr-1" /> 添加文件
              </Button>
            </div>
            {configFiles.map((file, idx) => (
              <Card key={idx} className="mb-3">
                <CardContent className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="文件路径，如 ~/.config/hypr/hyprland.conf"
                      value={file.path}
                      onChange={(e) => updateConfigFile(idx, "path", e.target.value)}
                      className="flex-1"
                    />
                    <Select
                      value={file.language}
                      onValueChange={(v) => updateConfigFile(idx, "language", v)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plaintext">Plain</SelectItem>
                        <SelectItem value="ini">INI</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="yaml">YAML</SelectItem>
                        <SelectItem value="toml">TOML</SelectItem>
                        <SelectItem value="bash">Bash</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="rust">Rust</SelectItem>
                        <SelectItem value="lua">Lua</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeConfigFile(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Editor
                    height="200px"
                    language={file.language || "plaintext"}
                    value={file.content}
                    onChange={(v) => updateConfigFile(idx, "content", v || "")}
                    theme="vs-dark"
                    options={{ minimap: { enabled: false }, fontSize: 13 }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Markdown Body */}
          <div>
            <Label>教程正文 (Markdown)</Label>
            <Editor
              height="400px"
              language="markdown"
              value={content}
              onChange={(v) => setContent(v || "")}
              theme="vs-dark"
              options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on" }}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={publishMutation.isPending}>
              {publishMutation.isPending ? "发布中..." : isEdit ? "保存修改" : "发布配置"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              取消
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/PublishPage.tsx
git commit -m "feat: publish/edit page with image upload, Monaco editor, config files"
```

---

### Task 5.6: 用户主页 & 设置 & 搜索页面

**Files:**
- Create: `frontend/src/pages/UserProfilePage.tsx`
- Create: `frontend/src/pages/SearchPage.tsx`
- Create: `frontend/src/pages/SettingsPage.tsx`

- [ ] **Step 1: 创建用户主页**

```tsx
// frontend/src/pages/UserProfilePage.tsx
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import ConfigCard from "@/components/ConfigCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { User, PostListItem } from "@/types";

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();

  const { data: user } = useQuery({
    queryKey: ["user", username],
    queryFn: () => api.get<User>(`/users/${username}`),
    enabled: !!username,
  });

  const { data: posts } = useQuery({
    queryKey: ["user-posts", username],
    queryFn: () => api.get<PostListItem[]>(`/users/${username}/posts`),
    enabled: !!username,
  });

  if (!user) return <Layout><div className="text-center py-20">用户不存在</div></Layout>;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="text-xl">{user.display_name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{user.display_name}</h1>
            <p className="text-muted-foreground">@{user.username}</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-4">发布的配置 ({posts?.length || 0})</h2>
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
          {posts?.map((post) => (
            <ConfigCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: 创建搜索页面**

```tsx
// frontend/src/pages/SearchPage.tsx
import { useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import ConfigCard from "@/components/ConfigCard";
import { Loader2 } from "lucide-react";
import type { PostListPage, PostListItem } from "@/types";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["search", q],
      queryFn: async ({ pageParam = 1 }) =>
        api.get<PostListPage>(`/search?q=${encodeURIComponent(q)}&page=${pageParam}`),
      getNextPageParam: (last) =>
        (last.page + 1) * last.per_page < last.total ? last.page + 1 : undefined,
      initialPageParam: 1,
      enabled: !!q,
    });

  const posts: PostListItem[] = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">搜索结果: "{q}"</h1>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">没有找到相关配置</div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
            {posts.map((post) => (
              <ConfigCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 3: 创建设置页面**

```tsx
// frontend/src/pages/SettingsPage.tsx
import { useAuthStore } from "@/stores/auth";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function SettingsPage() {
  const { user, logout } = useAuthStore();

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">设置</h1>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>个人资料</CardTitle>
            <CardDescription>你的账户信息</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user?.avatar_url} />
              <AvatarFallback>{user?.display_name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user?.display_name}</p>
              <p className="text-sm text-muted-foreground">@{user?.username}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>客户端下载</CardTitle>
            <CardDescription>下载 Rust TUI 客户端实现自动同步</CardDescription>
          </CardHeader>
          <CardContent className="space-x-3">
            <Button variant="outline" asChild>
              <a href="/download/lain-linux-amd64" target="_blank">Linux x64</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/download/lain-macos-arm64" target="_blank">macOS ARM</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/download/lain-windows-amd64.exe" target="_blank">Windows x64</a>
            </Button>
          </CardContent>
        </Card>

        <Button variant="destructive" onClick={logout}>退出登录</Button>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/UserProfilePage.tsx frontend/src/pages/SearchPage.tsx frontend/src/pages/SettingsPage.tsx
git commit -m "feat: user profile, search, and settings pages"
```

---

## Phase 6: gRPC 服务

### Task 6.1: 编译 Proto & 实现 gRPC Service

**Files:**
- Create: `backend/app/grpc/__init__.py`
- Create: `backend/app/grpc/config_sync.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: 编译 proto 生成 Python 代码**

```bash
cd backend
python -m grpc_tools.protoc \
  -I../proto \
  --python_out=app/grpc/generated \
  --grpc_python_out=app/grpc/generated \
  ../proto/config_sync.proto
```

创建 `backend/app/grpc/generated/__init__.py` (空文件)。

- [ ] **Step 2: 创建 backend/app/grpc/config_sync.py**

```python
import hashlib
import json
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import async_session
from app.models import Collection, Post, User
from app.services.auth import get_user_id_from_token


def hash_config(post: Post) -> str:
    """计算配置文件的版本哈希"""
    data = json.dumps(post.config_files, sort_keys=True)
    return hashlib.sha256(data.encode()).hexdigest()[:12]


class ConfigSyncServicer:
    async def ListSubscriptions(self, request, context):
        user_id = self._authenticate(context)
        if not user_id:
            return

        async with async_session() as db:
            result = await db.execute(
                select(Collection)
                .options(selectinload(Collection.posts))
                .where(Collection.user_id == UUID(user_id), Collection.is_subscribed == True)
            )
            collections = result.unique().scalars().all()

            from app.grpc.generated import config_sync_pb2 as pb2
            response = pb2.ListSubscriptionsResponse()
            for col in collections:
                sub = response.subscriptions.add()
                sub.collection_id = str(col.id)
                sub.collection_name = col.name
                sub.post_count = len(col.posts)
                sub.is_subscribed = col.is_subscribed
            return response

    async def GetCollectionConfigs(self, request, context):
        user_id = self._authenticate(context)
        async with async_session() as db:
            col = await db.execute(
                select(Collection).options(selectinload(Collection.posts))
                .where(Collection.id == UUID(request.collection_id))
            )
            col = col.scalar_one_or_none()
            if not col or str(col.user_id) != user_id:
                return

            from app.grpc.generated import config_sync_pb2 as pb2
            response = pb2.GetCollectionConfigsResponse()
            response.collection_name = col.name
            for post in col.posts:
                c = response.configs.add()
                c.post_id = str(post.id)
                c.title = post.title
                c.version_hash = hash_config(post)
                c.updated_at = post.updated_at.isoformat()
            return response

    async def PullConfig(self, request, context):
        async with async_session() as db:
            result = await db.execute(
                select(Post).where(Post.id == UUID(request.post_id))
            )
            post = result.scalar_one_or_none()
            if not post:
                return

            from app.grpc.generated import config_sync_pb2 as pb2
            response = pb2.PullConfigResponse()
            response.post_id = str(post.id)
            response.title = post.title
            response.version_hash = hash_config(post)
            for f in post.config_files:
                cf = response.files.add()
                cf.path = f["path"]
                cf.content = f["content"]
                cf.language = f.get("language", "plaintext")
            return response

    async def CheckUpdates(self, request, context):
        user_id = self._authenticate(context)
        async with async_session() as db:
            from app.grpc.generated import config_sync_pb2 as pb2
            response = pb2.CheckUpdatesResponse()
            for lc in request.local_configs:
                post = await db.get(Post, UUID(lc.post_id))
                if not post:
                    response.unknown_post_ids.append(lc.post_id)
                elif hash_config(post) != lc.version_hash:
                    response.outdated_post_ids.append(lc.post_id)
                else:
                    response.up_to_date_post_ids.append(lc.post_id)
            return response

    def _authenticate(self, context) -> str | None:
        metadata = dict(context.invocation_metadata())
        token = metadata.get("authorization", "").replace("Bearer ", "")
        try:
            return get_user_id_from_token(token)
        except Exception:
            return None
```

- [ ] **Step 3: 修改 backend/app/main.py 启动 gRPC 服务器**

```python
import asyncio
import grpc
from concurrent.futures import ThreadPoolExecutor
from app.grpc.generated import config_sync_pb2, config_sync_pb2_grpc
from app.grpc.config_sync import ConfigSyncServicer


async def serve_grpc():
    server = grpc.aio.server()
    config_sync_pb2_grpc.add_ConfigSyncServicer_to_server(ConfigSyncServicer(), server)
    server.add_insecure_port("[::]:50051")
    await server.start()
    print("gRPC server started on :50051")
    await server.wait_for_termination()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    grpc_task = asyncio.create_task(serve_grpc())
    yield
    grpc_task.cancel()
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/grpc/ backend/app/main.py
git commit -m "feat: gRPC ConfigSync service — ListSubscriptions, PullConfig, CheckUpdates"
```

---

## Phase 7: Rust TUI 客户端

### Task 7.1: 初始化 Rust 项目 & Proto 编译

**Files:**
- Create: `client/Cargo.toml`
- Create: `client/build.rs`
- Create: `client/src/main.rs`
- Create: `client/src/grpc.rs`
- Create: `client/src/state.rs`
- Create: `client/src/ui/`
- Create: `client/src/ui/mod.rs`
- Create: `client/src/ui/sync.rs`
- Create: `client/src/ui/settings.rs`

- [ ] **Step 1: 初始化 Rust 项目**

```bash
cargo init client --name lain-client
```

- [ ] **Step 2: 编写 client/Cargo.toml**

```toml
[package]
name = "lain-client"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "lain"
path = "src/main.rs"

[dependencies]
tokio = { version = "1", features = ["full"] }
tonic = "0.12"
prost = "0.13"
ratatui = "0.29"
crossterm = "0.28"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
directories = "5"
dirs = "5"

[build-dependencies]
tonic-build = "0.12"
```

- [ ] **Step 3: 编写 client/build.rs**

```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::configure()
        .build_server(false)
        .compile(
            &["../proto/config_sync.proto"],
            &["../proto"],
        )?;
    Ok(())
}
```

- [ ] **Step 4: 编写 client/src/state.rs — 本地状态管理**

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LocalConfig {
    pub post_id: String,
    pub version_hash: String,
    pub title: String,
    pub files: Vec<(String, String)>, // (path, content)
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AppState {
    pub server_url: String,
    pub auth_token: String,
    pub configs: HashMap<String, LocalConfig>,
}

fn state_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("lain")
        .join("state.json")
}

impl AppState {
    pub fn load() -> Self {
        let path = state_path();
        if path.exists() {
            let data = fs::read_to_string(&path).unwrap_or_default();
            serde_json::from_str(&data).unwrap_or_default()
        } else {
            AppState {
                server_url: "http://myserver:50051".to_string(),
                ..Default::default()
            }
        }
    }

    pub fn save(&self) {
        let path = state_path();
        fs::create_dir_all(path.parent().unwrap()).ok();
        fs::write(&path, serde_json::to_string_pretty(self).unwrap()).ok();
    }

    pub fn token_header(&self) -> String {
        format!("Bearer {}", self.auth_token)
    }
}
```

- [ ] **Step 5: 编写 client/src/grpc.rs — gRPC 调用封装**

```rust
use tonic::metadata::MetadataValue;
use tonic::transport::Channel;
use tonic::Request;

pub mod proto {
    tonic::include_proto!("lain42");
}

use proto::{config_sync_client::ConfigSyncClient, *};

pub struct LainClient {
    client: ConfigSyncClient<Channel>,
    token: String,
}

impl LainClient {
    pub async fn connect(server_url: &str, token: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let channel = Channel::from_shared(server_url.to_string())?
            .connect()
            .await?;
        Ok(LainClient {
            client: ConfigSyncClient::new(channel),
            token: token.to_string(),
        })
    }

    fn auth_request<T>(&self, req: T) -> Request<T> {
        let mut request = Request::new(req);
        let token: MetadataValue<_> = format!("Bearer {}", self.token)
            .parse()
            .unwrap();
        request.metadata_mut().insert("authorization", token);
        request
    }

    pub async fn check_updates(
        &mut self,
        locals: Vec<ConfigVersion>,
    ) -> Result<CheckUpdatesResponse, tonic::Status> {
        let req = CheckUpdatesRequest { local_configs: locals };
        let resp = self.client.check_updates(self.auth_request(req)).await?;
        Ok(resp.into_inner())
    }

    pub async fn pull_config(&mut self, post_id: &str) -> Result<PullConfigResponse, tonic::Status> {
        let req = PullConfigRequest { post_id: post_id.to_string() };
        let resp = self.client.pull_config(self.auth_request(req)).await?;
        Ok(resp.into_inner())
    }

    pub async fn list_subscriptions(
        &mut self,
    ) -> Result<ListSubscriptionsResponse, tonic::Status> {
        let req = ListSubscriptionsRequest {};
        let resp = self.client.list_subscriptions(self.auth_request(req)).await?;
        Ok(resp.into_inner())
    }
}
```

- [ ] **Step 6: 编写 client/src/ui/sync.rs — 同步面板**

```rust
use ratatui::{
    layout::{Constraint, Layout, Rect},
    style::{Color, Style},
    widgets::{Block, Borders, List, ListItem, Paragraph},
    Frame,
};
use crate::grpc::LainClient;
use crate::state::AppState;
use std::collections::HashMap;

pub struct SyncTab {
    pub outdated_ids: Vec<String>,
    pub synced: HashMap<String, String>, // post_id -> title
    pub status: String,
}

impl SyncTab {
    pub fn new() -> Self {
        SyncTab {
            outdated_ids: vec![],
            synced: HashMap::new(),
            status: "按 'r' 刷新同步状态".to_string(),
        }
    }

    pub async fn refresh(&mut self, client: &mut LainClient, state: &AppState) {
        self.status = "检查更新中...".to_string();
        let locals: Vec<_> = state
            .configs
            .values()
            .map(|c| crate::grpc::proto::ConfigVersion {
                post_id: c.post_id.clone(),
                version_hash: c.version_hash.clone(),
            })
            .collect();

        match client.check_updates(locals).await {
            Ok(resp) => {
                self.outdated_ids = resp.outdated_post_ids;
                self.synced.clear();
                for id in &resp.up_to_date_post_ids {
                    if let Some(c) = state.configs.get(id) {
                        self.synced.insert(c.post_id.clone(), c.title.clone());
                    }
                }
                self.status = format!(
                    "{} 个有更新, {} 个已是最新",
                    self.outdated_ids.len(),
                    self.synced.len(),
                );
            }
            Err(e) => {
                self.status = format!("连接失败: {}", e);
            }
        }
    }

    pub fn render(&self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::vertical([
            Constraint::Length(3),
            Constraint::Min(0),
        ])
        .split(area);

        let status = Paragraph::new(self.status.as_str())
            .block(Block::default().borders(Borders::ALL).title("状态"));
        frame.render_widget(status, chunks[0]);

        let mut items: Vec<ListItem> = vec![];

        if !self.outdated_ids.is_empty() {
            items.push(ListItem::new("── 可更新 ──").style(Style::default().fg(Color::Yellow)));
            for id in &self.outdated_ids {
                items.push(ListItem::new(format!("  ✦ {}", id)));
            }
        }

        if !self.synced.is_empty() {
            items.push(ListItem::new("── 已同步 ──").style(Style::default().fg(Color::Green)));
            for (id, title) in &self.synced {
                items.push(ListItem::new(format!("  ✓ {} - {}", title, id)));
            }
        }

        if self.outdated_ids.is_empty() && self.synced.is_empty() {
            items.push(ListItem::new("  没有已订阅的配置。在网页端收藏配置并开启自动同步。"));
        }

        let list = List::new(items).block(
            Block::default().borders(Borders::ALL).title("配置列表"),
        );
        frame.render_widget(list, chunks[1]);
    }
}
```

- [ ] **Step 7: 编写 client/src/ui/settings.rs — 设置面板**

```rust
use ratatui::{
    layout::{Alignment, Constraint, Layout, Rect},
    widgets::{Block, Borders, Paragraph},
    Frame,
};
use crate::state::AppState;

pub struct SettingsTab {
    pub editing_server: bool,
    pub server_input: String,
    pub editing_token: bool,
    pub token_input: String,
    pub message: String,
}

impl SettingsTab {
    pub fn new() -> Self {
        SettingsTab {
            editing_server: false,
            server_input: String::new(),
            editing_token: false,
            token_input: String::new(),
            message: String::new(),
        }
    }

    pub fn render(&self, frame: &mut Frame, area: Rect, state: &AppState) {
        let chunks = Layout::vertical([
            Constraint::Length(3),
            Constraint::Length(3),
            Constraint::Length(3),
            Constraint::Length(3),
        ])
        .margin(1)
        .split(area);

        let server = Paragraph::new(format!("服务器: {}", state.server_url))
            .block(Block::default().borders(Borders::ALL).title("服务器地址"));
        frame.render_widget(server, chunks[0]);

        let token_display = if state.auth_token.is_empty() {
            "未设置 (在网页端 Settings 页面获取 token)"
        } else {
            "已设置 ✓"
        };
        let token = Paragraph::new(token_display)
            .block(Block::default().borders(Borders::ALL).title("认证 Token"));
        frame.render_widget(token, chunks[1]);

        let help = Paragraph::new(
            "按键: s → 修改服务器地址 | t → 修改 token | r → 刷新 | q → 退出\n\
             获取 token: 网页端登录后 → 设置 → API Token"
        )
            .block(Block::default().borders(Borders::ALL).title("帮助"));
        frame.render_widget(help, chunks[2]);

        if !self.message.is_empty() {
            let msg = Paragraph::new(self.message.as_str())
                .style(ratatui::style::Style::default().fg(Color::Yellow))
                .alignment(Alignment::Center);
            frame.render_widget(msg, chunks[3]);
        }
    }
}
```

- [ ] **Step 8: 编写 client/src/main.rs — 应用主循环**

```rust
mod grpc;
mod state;
mod ui;

use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyEventKind},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{backend::CrosstermBackend, Terminal};
use state::AppState;
use std::io;

enum Tab {
    Sync,
    Settings,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut state = AppState::load();
    let mut tab = Tab::Sync;
    let mut sync_tab = ui::sync::SyncTab::new();
    let mut settings_tab = ui::settings::SettingsTab::new();

    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // Connect gRPC client
    let mut client = match grpc::LainClient::connect(&state.server_url, &state.auth_token).await {
        Ok(c) => Some(c),
        Err(e) => {
            sync_tab.status = format!("连接失败: {}", e);
            None
        }
    };

    // Main event loop
    let tick_rate = std::time::Duration::from_millis(100);
    loop {
        terminal.draw(|frame| {
            let area = frame.area();
            match tab {
                Tab::Sync => sync_tab.render(frame, area),
                Tab::Settings => settings_tab.render(frame, area, &state),
            }
        })?;

        if event::poll(tick_rate)? {
            if let Event::Key(key) = event::read()? {
                if key.kind != KeyEventKind::Press {
                    continue;
                }
                match key.code {
                    KeyCode::Char('q') => break,
                    KeyCode::Char('1') => tab = Tab::Sync,
                    KeyCode::Char('2') => tab = Tab::Settings,
                    KeyCode::Char('r') => {
                        if let Some(ref mut c) = client {
                            sync_tab.refresh(c, &state).await;
                        }
                    }
                    KeyCode::Char('s') => {
                        settings_tab.editing_server = true;
                    }
                    _ => {}
                }
            }
        }
    }

    // Cleanup
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen, DisableMouseCapture)?;
    terminal.show_cursor()?;
    state.save();

    Ok(())
}
```

- [ ] **Step 9: 构建验证**

```bash
cd client && cargo build
```

- [ ] **Step 10: Commit**

```bash
git add client/
git commit -m "feat: Rust TUI client with ratatui — sync check, pull configs, settings"
```

---

## Phase 8: 部署

### Task 8.1: 完善 Docker Compose & Nginx 配置

**Files:**
- Modify: `docker-compose.yml`
- Create: `nginx.conf`

- [ ] **Step 1: 完善 docker-compose.yml**

```yaml
version: "3.9"
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: lain42
      POSTGRES_USER: lain42
      POSTGRES_PASSWORD: ${DB_PASSWORD:-lain42}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  app:
    build: ./backend
    ports:
      - "8000:8000"
      - "50051:50051"
    volumes:
      - images:/data/images
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql+asyncpg://lain42:${DB_PASSWORD:-lain42}@db:5432/lain42
      JWT_SECRET: ${JWT_SECRET}
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET}
      GITEE_CLIENT_ID: ${GITEE_CLIENT_ID}
      GITEE_CLIENT_SECRET: ${GITEE_CLIENT_SECRET}
      GITCODE_CLIENT_ID: ${GITCODE_CLIENT_ID}
      GITCODE_CLIENT_SECRET: ${GITCODE_CLIENT_SECRET}
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
      - images:/usr/share/nginx/html/images:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  pgdata:
  images:
```

- [ ] **Step 2: 创建 nginx.conf**

```nginx
events { worker_connections 1024; }

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    sendfile on;
    keepalive_timeout 65;

    server {
        listen 80;
        server_name _;

        # Frontend SPA
        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # Rest API
        location /api/ {
            proxy_pass http://app:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # Images
        location /images/ {
            alias /usr/share/nginx/html/images/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

- [ ] **Step 3: 构建前端**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: 部署到 myserver**

```bash
# 在服务器上
git clone <repo>
cd lain42
cp .env.example .env
# 编辑 .env 填入 OAuth client id/secret
docker compose up -d --build
```

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml nginx.conf
git commit -m "feat: production Docker Compose and Nginx config"
```

---

## 附录: 开发环境变量

创建 `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000/api
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_GITEE_CLIENT_ID=your_gitee_client_id
VITE_GITCODE_CLIENT_ID=your_gitcode_client_id
```

创建 `backend/.env`:
```env
DATABASE_URL=postgresql+asyncpg://lain42:lain42@localhost:5432/lain42
JWT_SECRET=dev-secret-do-not-use-in-prod
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITEE_CLIENT_ID=your_gitee_client_id
GITEE_CLIENT_SECRET=your_gitee_client_secret
GITCODE_CLIENT_ID=your_gitcode_client_id
GITCODE_CLIENT_SECRET=your_gitcode_client_secret
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```
