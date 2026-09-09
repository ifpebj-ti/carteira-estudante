from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.aluno import Aluno
from app.models.movimentacao import MovimentacaoPortaria


def validate_student_status(student: Aluno) -> None:
    if not student.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: A carteira digital deste aluno está inativa.",
        )


def determine_next_movement_type(student_id: int, db: Session) -> str:
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    last_movement = (
        db.query(MovimentacaoPortaria)
        .filter(MovimentacaoPortaria.aluno_id == student_id)
        .filter(MovimentacaoPortaria.data_hora >= today)
        .order_by(MovimentacaoPortaria.data_hora.desc())
        .first()
    )

    if last_movement and last_movement.tipo == "ENTRADA":
        return "SAIDA"

    return "ENTRADA"
