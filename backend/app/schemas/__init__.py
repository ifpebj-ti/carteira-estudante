# Pydantic schemas (Validação de I/O)

from app.schemas.aluno import AlunoBase, AlunoCreate, AlunoDetailResponse, AlunoResponse
from app.schemas.movimentacao import (
    MovimentacaoBase,
    MovimentacaoCreate,
    MovimentacaoResponse,
    ScanRequest,
    ScanResponse,
)
from app.schemas.usuario import UsuarioBase, UsuarioResponse

__all__ = [
    "UsuarioBase",
    "UsuarioResponse",
    "AlunoBase",
    "AlunoCreate",
    "AlunoResponse",
    "AlunoDetailResponse",
    "MovimentacaoBase",
    "MovimentacaoCreate",
    "MovimentacaoResponse",
    "ScanRequest",
    "ScanResponse",
]
