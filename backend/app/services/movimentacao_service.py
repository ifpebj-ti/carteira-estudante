from collections.abc import Sequence
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.enums import SentidoMovimentacao
from app.models.movimentacao import Movimentacao
from app.models.pessoa import Pessoa
from app.schemas.movimentacao import (
    MovimentacaoResponse,
    PessoaMovimentacaoResponse,
)


def _sort_movimentacoes_desc(
    movimentacoes: Sequence[Movimentacao],
) -> list[Movimentacao]:
    """Ordena movimentações da mais recente para a mais antiga."""
    return sorted(movimentacoes, key=lambda mov: mov.data_hora, reverse=True)


def build_movimentacao_responses(
    movimentacoes: Sequence[Movimentacao],
) -> list[MovimentacaoResponse]:
    """Formata e ordena movimentações para auditoria administrativa."""
    return [
        MovimentacaoResponse(
            id=mov.id,
            pessoa_id=mov.pessoa_id,
            operador_id=mov.operador_id,
            tipo=mov.tipo,
            local_acesso=mov.local_acesso,
            data_hora=mov.data_hora,
            operador_nome=mov.operador.nome if mov.operador else "Desconhecido",
        )
        for mov in _sort_movimentacoes_desc(movimentacoes)
    ]


def build_pessoa_movimentacao_responses(
    movimentacoes: Sequence[Movimentacao],
) -> list[PessoaMovimentacaoResponse]:
    """Formata e ordena movimentações para exibição ao titular sem operador."""
    return [
        PessoaMovimentacaoResponse(
            id=mov.id,
            tipo=mov.tipo,
            local_acesso=mov.local_acesso,
            data_hora=mov.data_hora,
        )
        for mov in _sort_movimentacoes_desc(movimentacoes)
    ]


def validate_student_status(student: Pessoa) -> None:
    if not student.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: A carteira digital deste pessoa está inativa.",
        )


def determine_next_movement_type(student: Pessoa, db: Session) -> str:
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    last_movement = (
        db.query(Movimentacao)
        .filter(Movimentacao.pessoa_id == student.id)
        .filter(Movimentacao.data_hora >= today)
        .order_by(Movimentacao.data_hora.desc())
        .first()
    )

    if last_movement:
        if last_movement.tipo == SentidoMovimentacao.ENTRADA:
            return SentidoMovimentacao.SAIDA
        return SentidoMovimentacao.ENTRADA

    # Primeiro movimento do dia depende se o pessoa mora no campus
    if student.is_interno:
        return SentidoMovimentacao.SAIDA

    return SentidoMovimentacao.ENTRADA
