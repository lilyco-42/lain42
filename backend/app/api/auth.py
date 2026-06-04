import time
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError
from app.database import get_db
from app.models import User, OAuthProvider
from app.schemas.auth import (
    RegisterRequest,
    PasswordLoginRequest,
    OAuthLoginRequest,
    TokenResponse,
    RefreshRequest,
    UserResponse,
    OAuthProviderInfo,
)
from app.services.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.services.oauth import get_provider
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory IP registration rate limiter: ip -> timestamp
_ip_register_timestamps: dict[str, float] = {}
_IP_REGISTER_COOLDOWN = 86400  # 24 hours — one registration per IP per day


def _check_ip_rate_limit(ip: str) -> float | None:
    """Returns None if allowed, or seconds remaining if blocked."""
    last = _ip_register_timestamps.get(ip)
    if last and (remaining := _IP_REGISTER_COOLDOWN - (time.time() - last)) > 0:
        return remaining
    return None


def _record_ip_register(ip: str):
    _ip_register_timestamps[ip] = time.time()


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
        OAuthProviderInfo(
            provider="qq",
            name="QQ",
            client_id=s.qq_client_id,
            authorize_url="https://graph.qq.com/oauth2.0/authorize",
        ),
        OAuthProviderInfo(
            provider="wechat",
            name="微信",
            client_id=s.wechat_client_id,
            authorize_url="https://open.weixin.qq.com/connect/qrconnect",
        ),
    ]


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    # IP rate limit
    ip = request.client.host if request.client else "unknown"
    if (remaining := _check_ip_rate_limit(ip)) is not None:
        hours = int(remaining // 3600)
        minutes = int((remaining % 3600) // 60)
        raise HTTPException(
            status_code=429,
            detail=f"同一 IP 每天只能注册一个账号。请等待 {hours} 小时 {minutes} 分钟后重试。",
        )

    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="该邮箱已被注册")

    # Check username uniqueness
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="该用户名已被使用")

    # Validate password strength
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="密码长度至少 8 位")

    user = User(
        username=body.username,
        display_name=body.display_name or body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        registration_ip=ip,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    _record_ip_register(ip)

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/password-login", response_model=TokenResponse)
async def password_login(body: PasswordLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


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
            email=oauth_user.email or None,
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
    return UserResponse.from_orm_user(user)
