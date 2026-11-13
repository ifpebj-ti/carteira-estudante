from typing import Optional

from pydantic import BaseModel


class LoginRequest(BaseModel):
    login: str
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    account_type: Optional[str] = None
    role: Optional[str] = None
