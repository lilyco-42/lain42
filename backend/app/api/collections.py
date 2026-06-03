from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Collection, Post, collection_post
from app.models.user import User
from app.schemas.collection import CollectionCreate, CollectionUpdate, CollectionResponse
from app.api.deps import get_current_user

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
        id=col.id,
        name=col.name,
        description=col.description,
        is_public=col.is_public,
        is_subscribed=col.is_subscribed,
        post_count=0,
        created_at=col.created_at,
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
        id=col.id,
        name=col.name,
        description=col.description,
        is_public=col.is_public,
        is_subscribed=col.is_subscribed,
        post_count=len(col.posts),
        created_at=col.created_at,
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
