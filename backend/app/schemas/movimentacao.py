from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import LocalAcesso, SentidoMovimentacao


class MovimentacaoBase(BaseModel):
    tipo: SentidoMovimentacao
    local_acesso: LocalAcesso


class MovimentacaoCreate(MovimentacaoBase):
    pessoa_id: int
    operador_id: int


class MovimentacaoResponse(MovimentacaoBase):
    id: int
    pessoa_id: int
    operador_id: int
    data_hora: datetime
    operador_nome: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ScanRequest(BaseModel):
    qr_code_hash: str
    local_acesso: LocalAcesso


class ScanResponse(BaseModel):
    student_name: str
    student_photo_url: Optional[str] = None
    movement_type: SentidoMovimentacao
    local_acesso: LocalAcesso
    status: bool
    created_at: datetime
