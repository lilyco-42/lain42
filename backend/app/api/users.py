from fastapi import APIRouter, Depends, HTTPException, Query
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
    return UserResponse.from_orm_user(user)


@router.get("/{username}/posts", response_model=list[PostListResponse])
async def get_user_posts(
    username: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=60),
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
