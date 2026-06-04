from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload, selectinload
from app.database import get_db
from app.models import Post, Image, Like
from app.models.post import PostCategory
from app.models.user import User
from app.models.collection import collection_post
from app.schemas.post import (
    PostCreate,
    PostUpdate,
    PostListResponse,
    PostDetailResponse,
    PostListPage,
)
from app.api.deps import get_current_user, get_optional_user

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

    query = select(Post).options(joinedload(Post.author))

    if category:
        query = query.where(Post.category == PostCategory(category))
    if tag:
        query = query.where(Post.tags.any(tag))

    if sort == "popular":
        query = query.order_by(Post.likes_count.desc(), Post.created_at.desc())
    else:
        query = query.order_by(Post.created_at.desc())

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

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
    if body.category not in [c.value for c in PostCategory]:
        raise HTTPException(status_code=400, detail=f"Invalid category: {body.category}")

    cover_image = ""
    if body.image_ids:
        first_image = await db.get(Image, body.image_ids[0])
        if first_image:
            cover_image = first_image.url_600

    # Auto-generate cover if no images
    if not cover_image:
        from app.services.cover_gen import generate_and_upload
        try:
            cover_image = generate_and_upload(body.title, body.description, body.content)
        except Exception:
            pass

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

    if body.image_ids:
        for idx, image_id in enumerate(body.image_ids):
            img = await db.get(Image, image_id)
            if img:
                img.post_id = post.id
                img.sort_order = idx

    await db.commit()
    await db.refresh(post)

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
            for idx, img_id in enumerate(val):
                img = await db.get(Image, img_id)
                if img:
                    img.post_id = post.id
                    img.sort_order = idx
            # Update cover_image to first image
            if val:
                first = await db.get(Image, val[0])
                if first:
                    post.cover_image = first.url_600
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
