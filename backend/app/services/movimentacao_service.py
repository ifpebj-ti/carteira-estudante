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


def _sort_movements_desc(
    movements: Sequence[Movimentacao],
) -> list[Movimentacao]:
    return sorted(movements, key=lambda movement: movement.data_hora, reverse=True)


def build_movement_responses(
    movements: Sequence[Movimentacao],
) -> list[MovimentacaoResponse]:
    return [
        MovimentacaoResponse(
            id=movement.id,
            pessoa_id=movement.pessoa_id,
            operador_id=movement.operador_id,
            tipo=movement.tipo,
            local_acesso=movement.local_acesso,
            data_hora=movement.data_hora,
            operador_nome=(
                movement.operador.nome if movement.operador else "Desconhecido"
            ),
        )
        for movement in _sort_movements_desc(movements)
    ]


def build_person_movement_responses(
    movements: Sequence[Movimentacao],
) -> list[PessoaMovimentacaoResponse]:
    return [
        PessoaMovimentacaoResponse(
            id=movement.id,
            tipo=movement.tipo,
            local_acesso=movement.local_acesso,
            data_hora=movement.data_hora,
        )
        for movement in _sort_movements_desc(movements)
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

    # Campus residents leave first; external commuters enter first.
    if student.is_interno:
        return SentidoMovimentacao.SAIDA

    return SentidoMovimentacao.ENTRADA
