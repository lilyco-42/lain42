from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
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
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Post not found")

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
