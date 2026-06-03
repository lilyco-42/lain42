from pydantic import BaseModel


class OAuthLoginRequest(BaseModel):
    provider: str
    code: str
    redirect_uri: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: str

    model_config = {"from_attributes": True}


class OAuthProviderInfo(BaseModel):
    provider: str
    name: str
    client_id: str
    authorize_url: str
