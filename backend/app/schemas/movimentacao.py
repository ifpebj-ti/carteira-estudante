from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class MovimentacaoBase(BaseModel):
    tipo: str


class MovimentacaoCreate(MovimentacaoBase):
    aluno_id: int
    usuario_id: int


class MovimentacaoResponse(MovimentacaoBase):
    id: int
    aluno_id: int
    usuario_id: int
    data_hora: datetime
    operador_nome: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
