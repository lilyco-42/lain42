import uuid
from pathlib import Path
from PIL import Image as PILImage
from app.config import get_settings

settings = get_settings()


def process_image(file_path: Path, post_id: str) -> dict:
    """Process image: generate 3 sizes of WebP thumbnails, return URLs dict.
    Returns: {"original": url, "600": url, "300": url}
    """
    base_dir = Path(settings.upload_dir) / post_id
    base_dir.mkdir(parents=True, exist_ok=True)

    base_name = uuid.uuid4().hex[:12]
    img = PILImage.open(file_path)

    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    def save_resized(size: int) -> str:
        filename = f"{base_name}_{size}.webp"
        output = base_dir / filename
        img_copy = img.copy()
        img_copy.thumbnail((size, size))
        img_copy.save(output, "WEBP", quality=85)
        return f"/images/{post_id}/{filename}"

    original_filename = f"{base_name}_original.webp"
    original_path = base_dir / original_filename
    img.save(original_path, "WEBP", quality=85)

    return {
        "original": f"/images/{post_id}/{original_filename}",
        "600": save_resized(600),
        "300": save_resized(300),
    }
