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


PROVIDERS: dict[str, OAuthProviderBase] = {
    "github": GitHubOAuth(),
    "gitee": GiteeOAuth(),
    "gitcode": GitCodeOAuth(),
}


def get_provider(name: str) -> OAuthProviderBase:
    provider = PROVIDERS.get(name)
    if not provider:
        raise ValueError(f"Unknown OAuth provider: {name}")
    return provider
