from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UsuarioBase(BaseModel):
    nome: str
    login: str
    perfil: str
    status: bool = True


class UsuarioResponse(UsuarioBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
