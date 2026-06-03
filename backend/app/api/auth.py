from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError
from app.database import get_db
from app.models import User, OAuthProvider
from app.schemas.auth import (
    OAuthLoginRequest,
    TokenResponse,
    RefreshRequest,
    UserResponse,
    OAuthProviderInfo,
)
from app.services.auth import create_access_token, create_refresh_token, decode_token
from app.services.oauth import get_provider
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/providers", response_model=list[OAuthProviderInfo])
async def list_providers():
    from app.config import get_settings

    s = get_settings()
    return [
        OAuthProviderInfo(
            provider="github",
            name="GitHub",
            client_id=s.github_client_id,
            authorize_url="https://github.com/login/oauth/authorize",
        ),
        OAuthProviderInfo(
            provider="gitee",
            name="Gitee",
            client_id=s.gitee_client_id,
            authorize_url="https://gitee.com/oauth/authorize",
        ),
        OAuthProviderInfo(
            provider="gitcode",
            name="GitCode",
            client_id=s.gitcode_client_id,
            authorize_url="https://gitcode.com/oauth/authorize",
        ),
    ]


@router.post("/login", response_model=TokenResponse)
async def oauth_login(body: OAuthLoginRequest, db: AsyncSession = Depends(get_db)):
    provider = get_provider(body.provider)
    oauth_user = await provider.authenticate(body.code)

    result = await db.execute(
        select(User).where(
            User.oauth_provider == OAuthProvider(body.provider),
            User.oauth_id == oauth_user.oauth_id,
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        base_username = oauth_user.username
        username = base_username
        counter = 1
        while True:
            existing = await db.execute(select(User).where(User.username == username))
            if not existing.scalar_one_or_none():
                break
            username = f"{base_username}{counter}"
            counter += 1

        user = User(
            username=username,
            display_name=oauth_user.display_name,
            avatar_url=oauth_user.avatar_url,
            oauth_provider=OAuthProvider(body.provider),
            oauth_id=oauth_user.oauth_id,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload["sub"]
    new_access = create_access_token(user_id)
    new_refresh = create_refresh_token(user_id)
    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return user
