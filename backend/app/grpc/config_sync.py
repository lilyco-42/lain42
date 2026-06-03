import hashlib
import json
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import async_session
from app.models import Collection, Post, User
from app.services.auth import get_user_id_from_token


def hash_config(post: Post) -> str:
    """Compute version hash of a post's config files."""
    data = json.dumps(post.config_files, sort_keys=True)
    return hashlib.sha256(data.encode()).hexdigest()[:12]


class ConfigSyncServicer:
    def _authenticate(self, context) -> str | None:
        metadata = dict(context.invocation_metadata())
        token = metadata.get("authorization", "").replace("Bearer ", "")
        try:
            return get_user_id_from_token(token)
        except Exception:
            return None

    async def ListSubscriptions(self, request, context):
        user_id = self._authenticate(context)
        if not user_id:
            return

        async with async_session() as db:
            result = await db.execute(
                select(Collection)
                .options(selectinload(Collection.posts))
                .where(Collection.user_id == UUID(user_id), Collection.is_subscribed == True)
            )
            collections = result.unique().scalars().all()

            response = type("SubscriptionsResponse", (), {
                "subscriptions": [
                    type("Subscription", (), {
                        "collection_id": str(col.id),
                        "collection_name": col.name,
                        "post_count": len(col.posts),
                        "is_subscribed": col.is_subscribed,
                    })()
                    for col in collections
                ]
            })()
            return response

    async def GetCollectionConfigs(self, request, context):
        user_id = self._authenticate(context)
        if not user_id:
            return

        async with async_session() as db:
            result = await db.execute(
                select(Collection)
                .options(selectinload(Collection.posts))
                .where(Collection.id == UUID(request.collection_id))
            )
            col = result.scalar_one_or_none()
            if not col or str(col.user_id) != user_id:
                return

            response = type("ConfigsResponse", (), {
                "collection_name": col.name,
                "configs": [
                    type("ConfigSummary", (), {
                        "post_id": str(p.id),
                        "title": p.title,
                        "version_hash": hash_config(p),
                        "updated_at": p.updated_at.isoformat() if p.updated_at else "",
                    })()
                    for p in col.posts
                ]
            })()
            return response

    async def PullConfig(self, request, context):
        async with async_session() as db:
            result = await db.execute(
                select(Post).where(Post.id == UUID(request.post_id))
            )
            post = result.scalar_one_or_none()
            if not post:
                return

            response = type("PullConfigResponse", (), {
                "post_id": str(post.id),
                "title": post.title,
                "version_hash": hash_config(post),
                "files": [
                    type("ConfigFile", (), {
                        "path": f["path"],
                        "content": f["content"],
                        "language": f.get("language", "plaintext"),
                    })()
                    for f in post.config_files
                ]
            })()
            return response

    async def CheckUpdates(self, request, context):
        user_id = self._authenticate(context)
        if not user_id:
            return

        async with async_session() as db:
            outdated = []
            up_to_date = []
            unknown = []
            for lc in request.local_configs:
                post = await db.get(Post, UUID(lc.post_id))
                if not post:
                    unknown.append(lc.post_id)
                elif hash_config(post) != lc.version_hash:
                    outdated.append(lc.post_id)
                else:
                    up_to_date.append(lc.post_id)

            response = type("CheckUpdatesResponse", (), {
                "outdated_post_ids": outdated,
                "up_to_date_post_ids": up_to_date,
                "unknown_post_ids": unknown,
            })()
            return response
