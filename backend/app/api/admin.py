from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User
from app.schemas.auth import UserResponse
from app.api.deps import get_admin_user

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()).limit(50))
    users = result.scalars().all()
    return [UserResponse.from_orm_user(u) for u in users]


@router.post("/promote/{username}")
async def promote_user(
    username: str,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_admin = True
    await db.commit()
    return {"ok": True, "username": username, "is_admin": True}
