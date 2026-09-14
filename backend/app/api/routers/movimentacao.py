import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.aluno import Aluno
from app.models.movimentacao import MovimentacaoPortaria
from app.schemas.movimentacao import ScanRequest, ScanResponse
from app.services.movimentacao_service import (
    determine_next_movement_type,
    validate_student_status,
)
from app.services.qr_crypto_service import decode_qr_token

router = APIRouter()


@router.post(
    "/scan",
    response_model=ScanResponse,
    summary="Ler QR Code da Catraca",
    status_code=status.HTTP_200_OK,
)
def scan_qr_code(
    request: ScanRequest,
    db: Session = Depends(get_db),
) -> ScanResponse:
    # 1. Decode JWT (Raises 400 if expired or invalid)
    aluno_id = decode_qr_token(request.qr_code_hash)

    # 2. Fetch Aluno
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado.",
        )

    # 3. Validate Status
    try:
        validate_student_status(aluno)
    except HTTPException:
        # According to the plan, if access is denied, we return status=False in payload
        # instead of failing the HTTP request, so the portaria app can
        # show a red screen.
        expected_movement = determine_next_movement_type(aluno.id, db)
        return ScanResponse(
            student_name=aluno.nome_completo,
            student_photo_url=aluno.foto_url,
            movement_type=expected_movement,
            status=False,
            created_at=datetime.datetime.now(datetime.timezone.utc),
        )

    # 4. Determine Movement (Entrada/Saída)
    movement_type = determine_next_movement_type(aluno.id, db)

    # 5. Register Movement
    nova_movimentacao = MovimentacaoPortaria(
        aluno_id=aluno.id,
        usuario_id=request.operator_id,
        tipo=movement_type,
    )
    db.add(nova_movimentacao)
    db.commit()
    db.refresh(nova_movimentacao)

    # 6. Return Success Response
    return ScanResponse(
        student_name=aluno.nome_completo,
        student_photo_url=aluno.foto_url,
        movement_type=movement_type,
        status=True,
        created_at=nova_movimentacao.data_hora,
    )
