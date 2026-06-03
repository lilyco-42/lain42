from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
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

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.offset(offset).limit(per_page)
    result = await db.execute(query)
    posts = result.unique().scalars().all()

    items = [PostListResponse.model_validate(p) for p in posts]
    return PostListPage(items=items, total=total, page=page, per_page=per_page)
