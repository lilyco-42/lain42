from fastapi import APIRouter
from app.services.mirror_fetcher import fetch_all_mirrors

router = APIRouter(prefix="/mirrors", tags=["mirrors"])


@router.get("")
async def get_mirrors():
    """Get latest download URLs from Chinese mirrors. Cached 6 hours."""
    results = await fetch_all_mirrors()

    # Group by tool
    tools = {}
    for tool, downloads in results.items():
        variants = []
        for d in downloads:
            variants.append({
                "name": d.get("name", ""),
                "url": d.get("url", ""),
                "version": d.get("version", ""),
                "os": d.get("os", "unknown"),
                "arch": d.get("arch", "x86_64"),
                "size": d.get("size", ""),
                "mirror": d.get("mirror", ""),
            })
        tools[tool] = variants

    return {"tools": tools, "updated": "auto"}
