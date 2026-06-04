from dataclasses import dataclass
import httpx
from app.config import get_settings

settings = get_settings()


@dataclass
class OAuthUser:
    oauth_id: str
    username: str
    display_name: str
    avatar_url: str
    email: str


class OAuthProviderBase:
    provider: str = ""
    authorize_url: str = ""
    token_url: str = ""
    userinfo_url: str = ""

    async def get_access_token(self, code: str) -> str:
        raise NotImplementedError

    async def get_user_info(self, access_token: str) -> OAuthUser:
        raise NotImplementedError

    async def authenticate(self, code: str) -> OAuthUser:
        token = await self.get_access_token(code)
        return await self.get_user_info(token)


class GitHubOAuth(OAuthProviderBase):
    provider = "github"
    authorize_url = "https://github.com/login/oauth/authorize"
    token_url = "https://github.com/login/oauth/access_token"
    userinfo_url = "https://api.github.com/user"

    async def get_access_token(self, code: str) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.token_url,
                json={
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "code": code,
                },
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            return resp.json()["access_token"]

    async def get_user_info(self, access_token: str) -> OAuthUser:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self.userinfo_url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            return OAuthUser(
                oauth_id=str(data["id"]),
                username=data["login"],
                display_name=data.get("name") or data["login"],
                avatar_url=data.get("avatar_url", ""),
                email=data.get("email", ""),
            )


class GiteeOAuth(OAuthProviderBase):
    provider = "gitee"
    authorize_url = "https://gitee.com/oauth/authorize"
    token_url = "https://gitee.com/oauth/token"
    userinfo_url = "https://gitee.com/api/v5/user"

    async def get_access_token(self, code: str) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.token_url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": settings.gitee_client_id,
                    "client_secret": settings.gitee_client_secret,
                    "redirect_uri": settings.gitee_redirect_uri,
                },
            )
            resp.raise_for_status()
            return resp.json()["access_token"]

    async def get_user_info(self, access_token: str) -> OAuthUser:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self.userinfo_url,
                params={"access_token": access_token},
            )
            resp.raise_for_status()
            data = resp.json()
            return OAuthUser(
                oauth_id=str(data["id"]),
                username=data["login"],
                display_name=data.get("name") or data["login"],
                avatar_url=data.get("avatar_url", ""),
                email=data.get("email", ""),
            )


class GitCodeOAuth(OAuthProviderBase):
    provider = "gitcode"
    authorize_url = "https://gitcode.com/oauth/authorize"
    token_url = "https://gitcode.com/oauth/token"
    userinfo_url = "https://gitcode.com/api/v5/user"

    async def get_access_token(self, code: str) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.token_url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": settings.gitcode_client_id,
                    "client_secret": settings.gitcode_client_secret,
                    "redirect_uri": settings.gitcode_redirect_uri,
                },
            )
            resp.raise_for_status()
            return resp.json()["access_token"]

    async def get_user_info(self, access_token: str) -> OAuthUser:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self.userinfo_url,
                params={"access_token": access_token},
            )
            resp.raise_for_status()
            data = resp.json()
            return OAuthUser(
                oauth_id=str(data["id"]),
                username=data.get("username", ""),
                display_name=data.get("nickname") or data.get("username", ""),
                avatar_url=data.get("avatar_url", ""),
                email=data.get("email", ""),
            )


class QQOAuth(OAuthProviderBase):
    provider = "qq"
    authorize_url = "https://graph.qq.com/oauth2.0/authorize"
    token_url = "https://graph.qq.com/oauth2.0/token"
    openid_url = "https://graph.qq.com/oauth2.0/me"
    userinfo_url = "https://graph.qq.com/user/get_user_info"

    async def get_access_token(self, code: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self.token_url,
                params={
                    "grant_type": "authorization_code",
                    "client_id": settings.qq_client_id,
                    "client_secret": settings.qq_client_secret,
                    "code": code,
                    "redirect_uri": settings.qq_redirect_uri,
                    "fmt": "json",
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def get_openid(self, access_token: str) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self.openid_url,
                params={"access_token": access_token, "fmt": "json"},
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("openid", "")

    async def get_user_info(self, access_token: str) -> OAuthUser:
        openid = await self.get_openid(access_token)
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self.userinfo_url,
                params={
                    "access_token": access_token,
                    "oauth_consumer_key": settings.qq_client_id,
                    "openid": openid,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return OAuthUser(
                oauth_id=openid,
                username=data.get("nickname", f"qq_{openid[:8]}"),
                display_name=data.get("nickname", "QQ用户"),
                avatar_url=data.get("figureurl_qq_2") or data.get("figureurl", ""),
                email="",
            )

    async def authenticate(self, code: str) -> OAuthUser:
        token_data = await self.get_access_token(code)
        return await self.get_user_info(token_data["access_token"])


class WeChatOAuth(OAuthProviderBase):
    provider = "wechat"
    authorize_url = "https://open.weixin.qq.com/connect/qrconnect"
    token_url = "https://api.weixin.qq.com/sns/oauth2/access_token"
    userinfo_url = "https://api.weixin.qq.com/sns/userinfo"

    async def get_access_token(self, code: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self.token_url,
                params={
                    "appid": settings.wechat_client_id,
                    "secret": settings.wechat_client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def get_user_info(self, access_token: str) -> OAuthUser:
        token_data = await self.get_access_token(access_token) if isinstance(access_token, str) else None  # noqa
        # access_token is actually passed directly here
        return None  # handled in authenticate override

    async def authenticate(self, code: str) -> OAuthUser:
        token_data = await self.get_access_token(code)
        openid = token_data.get("openid", "")
        access_token = token_data.get("access_token", "")

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self.userinfo_url,
                params={
                    "access_token": access_token,
                    "openid": openid,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        return OAuthUser(
            oauth_id=openid,
            username=f"wx_{openid[:8]}",
            display_name=data.get("nickname", "微信用户"),
            avatar_url=data.get("headimgurl", ""),
            email="",
        )


PROVIDERS: dict[str, OAuthProviderBase] = {
    "github": GitHubOAuth(),
    "gitee": GiteeOAuth(),
    "gitcode": GitCodeOAuth(),
    "qq": QQOAuth(),
    "wechat": WeChatOAuth(),
}


def get_provider(name: str) -> OAuthProviderBase:
    provider = PROVIDERS.get(name)
    if not provider:
        raise ValueError(f"Unknown OAuth provider: {name}")
    return provider
