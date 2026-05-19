import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.config import settings

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png"}
MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

# <backend_root>/media/players/
MEDIA_DIR = Path(__file__).resolve().parent.parent.parent / "media" / "players"


def _cloudinary_configured() -> bool:
    placeholder = {"", "your_api_key", "your_cloud_name", "your_api_secret"}
    return (
        settings.CLOUDINARY_API_KEY not in placeholder
        and settings.CLOUDINARY_CLOUD_NAME not in placeholder
        and settings.CLOUDINARY_API_SECRET not in placeholder
    )


async def upload_player_photo(file: UploadFile) -> str:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG/PNG images are allowed")

    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Photo must be under 5 MB")

    if _cloudinary_configured():
        return _upload_to_cloudinary(contents)
    return _save_locally(file.filename or "photo.jpg", contents)


def _upload_to_cloudinary(contents: bytes) -> str:
    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )
    try:
        result = cloudinary.uploader.upload(
            contents, folder="tournament/players", resource_type="image"
        )
        return result["secure_url"]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {exc}")


def _save_locally(original_name: str, contents: bytes) -> str:
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else "jpg"
    if ext not in ("jpg", "jpeg", "png"):
        ext = "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    (MEDIA_DIR / filename).write_bytes(contents)
    return f"/media/players/{filename}"
