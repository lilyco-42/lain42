import uuid, tempfile
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from app.database import get_db
from app.models import Image, Post
from app.models.user import User
from app.api.deps import get_current_user
from app.services.oss_upload import process_and_upload, delete_from_oss
import aiofiles

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(400, f"Unsupported type: {file.content_type}")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File exceeds 10MB limit")

    tmp_path = Path(tempfile.gettempdir()) / "lain42" / f"{uuid.uuid4().hex}.tmp"
    tmp_path.parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(tmp_path, "wb") as f:
        await f.write(content)

    try:
        urls = process_and_upload(tmp_path, "tmp")
    except Exception as e:
        raise HTTPException(400, f"Upload failed: {e}")
    finally:
        tmp_path.unlink(missing_ok=True)

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


@router.delete("/image/{image_id}", status_code=204)
async def delete_image(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    img = await db.get(Image, image_id)
    if not img:
        raise HTTPException(404, "Image not found")

    for url in [img.url_original, img.url_600, img.url_300]:
        if "lain42/images/" in url:
            key = url.split("lain42/images/", 1)[-1]
            full_key = f"lain42/images/tmp/{key.split('/')[-1]}"
            delete_from_oss(full_key)

    if img.post_id:
        await db.execute(
            update(Post).where(
                Post.id == img.post_id,
                Post.cover_image.in_([img.url_600, img.url_300, img.url_original])
            ).values(cover_image="")
        )

    await db.delete(img)
    await db.commit()
