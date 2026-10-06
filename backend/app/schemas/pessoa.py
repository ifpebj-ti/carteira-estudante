from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.movimentacao import MovimentacaoResponse


class PessoaBase(BaseModel):
    matricula: str
    nome_completo: str
    curso: str
    modalidade: Optional[str] = None
    idade: Optional[int] = None
    email: Optional[str] = None
    foto_url: Optional[str] = None
    status: bool = True


class PessoaCreate(PessoaBase):
    senha: str
    qr_code_hash: str


class PessoaResponse(PessoaBase):
    id: int
    qr_code_hash: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PessoaDetailResponse(PessoaResponse):
    movimentacoes: List[MovimentacaoResponse] = []
