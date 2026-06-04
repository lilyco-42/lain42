import uuid, io
from pathlib import Path
from PIL import Image as PILImage
import oss2
from app.config import get_settings

settings = get_settings()

_endpoint = f"https://{settings.oss_region}.aliyuncs.com"
_auth = oss2.Auth(settings.oss_access_key_id, settings.oss_access_key_secret)
_bucket = oss2.Bucket(_auth, _endpoint, settings.oss_bucket)
_cdn = f"https://{settings.oss_bucket}.{settings.oss_region}.aliyuncs.com"
_prefix = "lain42/images/"


def upload_to_oss(key: str, data: bytes, content_type: str = "image/webp"):
    _bucket.put_object(key, data, headers={"Content-Type": content_type})
    return f"{_cdn}/{key}"


def delete_from_oss(key: str):
    try:
        _bucket.delete_object(key)
    except Exception:
        pass


def process_and_upload(file_path: Path, post_id: str) -> dict:
    base_name = uuid.uuid4().hex[:12]
    prefix = f"{_prefix}{post_id}"
    img = PILImage.open(file_path)

    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    def save_and_upload(size: int) -> str:
        copy = img.copy()
        copy.thumbnail((size, size))
        buf = io.BytesIO()
        copy.save(buf, "WEBP", quality=85)
        key = f"{prefix}/{base_name}_{size}.webp"
        upload_to_oss(key, buf.getvalue())
        return f"{_cdn}/{key}"

    orig_buf = io.BytesIO()
    img.save(orig_buf, "WEBP", quality=85)
    orig_key = f"{prefix}/{base_name}_original.webp"
    upload_to_oss(orig_key, orig_buf.getvalue())

    return {
        "original": f"{_cdn}/{orig_key}",
        "600": save_and_upload(600),
        "300": save_and_upload(300),
    }
