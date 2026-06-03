from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    display_name: str | None = None


class PasswordLoginRequest(BaseModel):
    email: EmailStr
    password: str


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
    email: str | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_user(cls, user) -> "UserResponse":
        return cls(
            id=str(user.id),
            username=user.username,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
            email=user.email,
        )


class OAuthProviderInfo(BaseModel):
    provider: str
    name: str
    client_id: str
    authorize_url: str
