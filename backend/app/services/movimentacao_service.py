from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.enums import SentidoMovimentacao
from app.models.movimentacao import Movimentacao
from app.models.pessoa import Pessoa


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
