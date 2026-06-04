import uuid, tempfile, asyncio
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from app.database import get_db, async_session
from app.models import Image, Post
from app.models.user import User
from app.api.deps import get_current_user
from app.services.oss_upload import process_and_upload, delete_from_oss, upload_to_oss
import aiofiles

router = APIRouter(prefix="/upload", tags=["upload"])


async def _process_thumbnails(image_id: str, file_path: Path):
    """Background task: process and upload thumbnails to OSS."""
    try:
        urls = process_and_upload(file_path, "tmp")
        async with async_session() as db:
            img = await db.get(Image, uuid.UUID(image_id))
            if img:
                img.url_original = urls["original"]
                img.url_600 = urls["600"]
                img.url_300 = urls["300"]
                await db.commit()
    except Exception:
        pass
    finally:
        file_path.unlink(missing_ok=True)


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(400, f"Unsupported type: {file.content_type}")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File exceeds 10MB limit")

    # Upload raw file to OSS immediately
    base_name = uuid.uuid4().hex[:12]
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "png"
    upload_key = f"lain42/images/tmp/{base_name}_raw.{ext}"
    cdn_url = upload_to_oss(upload_key, content, file.content_type or "image/png")

    # Save temp file for background thumbnail processing
    tmp_path = Path(tempfile.gettempdir()) / "lain42" / f"{uuid.uuid4().hex}.tmp"
    tmp_path.parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(tmp_path, "wb") as f:
        await f.write(content)

    # Create image record with raw URL first (shown immediately)
    image = Image(
        url_original=cdn_url,
        url_600=cdn_url,
        url_300=cdn_url,
    )
    db.add(image)
    await db.commit()
    await db.refresh(image)

    # Process thumbnails in background
    background_tasks.add_task(_process_thumbnails, str(image.id), tmp_path)

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


@router.get("/sign")
async def sign_upload(
    filename: str = "image.png",
    current_user: User = Depends(get_current_user),
):
    """Get a signed URL for direct browser-to-OSS upload (bypasses server)."""
    from app.services.oss_upload import sign_upload
    return sign_upload(filename)


@router.post("/register")
async def register_upload(
    key: str,
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_user),
):
    """Register an image that was uploaded directly to OSS. Triggers thumbnail processing."""
    from app.services.oss_upload import _cdn
    cdn_url = f"{_cdn}/{key}"

    image = Image(
        url_original=cdn_url,
        url_600=cdn_url,
        url_300=cdn_url,
    )
    db.add(image)
    await db.commit()
    await db.refresh(image)

    # Download from OSS and process thumbnails in background
    import tempfile, aiohttp
    tmp_path = Path(tempfile.gettempdir()) / "lain42" / f"{uuid.uuid4().hex}.tmp"
    tmp_path.parent.mkdir(parents=True, exist_ok=True)

    async def _download_and_process():
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(cdn_url) as resp:
                    data = await resp.read()
            async with aiofiles.open(tmp_path, "wb") as f:
                await f.write(data)
            await _process_thumbnails(str(image.id), tmp_path)
        except Exception:
            pass

    background_tasks.add_task(_download_and_process)

    return {
        "id": str(image.id),
        "url_original": image.url_original,
        "url_600": image.url_600,
        "url_300": image.url_300,
    }
