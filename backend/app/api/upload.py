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
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(400, f"Unsupported type: {file.content_type}")

    content = await file.read()
    max_bytes = settings.max_image_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(400, f"File exceeds {settings.max_image_size_mb}MB limit")

    tmp_dir = Path(settings.upload_dir) / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    tmp_path = tmp_dir / f"{uuid.uuid4().hex}.tmp"
    async with aiofiles.open(tmp_path, "wb") as f:
        await f.write(content)

    try:
        urls = process_image(tmp_path, "tmp")
    except Exception as e:
        raise HTTPException(400, f"Image processing failed: {e}")
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
