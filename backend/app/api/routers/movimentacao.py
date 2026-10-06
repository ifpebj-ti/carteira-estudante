import datetime

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.movimentacao import Movimentacao
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema
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
    current_user: UsuarioSistema = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ScanResponse:
    # 1. Decode JWT (Raises 400 if expired or invalid)
    pessoa_id = decode_qr_token(request.qr_code_hash)

    # 2. Fetch Pessoa
    pessoa = db.query(Pessoa).filter(Pessoa.id == pessoa_id).first()
    if not pessoa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pessoa não encontrado.",
        )

    # 3. Validate Status
    try:
        validate_student_status(pessoa)
    except HTTPException:
        # According to the plan, if access is denied, we return status=False in payload
        # instead of failing the HTTP request, so the portaria app can
        # show a red screen.
        expected_movement = determine_next_movement_type(pessoa.id, db)
        return ScanResponse(
            student_name=pessoa.nome,
            student_photo_url=pessoa.foto_url,
            movement_type=expected_movement,
            local_acesso=request.local_acesso,
            status=False,
            created_at=datetime.datetime.now(datetime.timezone.utc),
        )

    # 4. Determine Movement (Entrada/Saída)
    movement_type = determine_next_movement_type(pessoa, db)

    # 5. Register Movement
    nova_movimentacao = Movimentacao(
        pessoa_id=pessoa.id,
        operador_id=current_user.id,
        tipo=movement_type,
        local_acesso=request.local_acesso,
    )
    db.add(nova_movimentacao)
    db.commit()
    db.refresh(nova_movimentacao)

    # 6. Return Success Response
    return ScanResponse(
        student_name=pessoa.nome,
        student_photo_url=pessoa.foto_url,
        movement_type=movement_type,
        local_acesso=request.local_acesso,
        status=True,
        created_at=nova_movimentacao.data_hora,
    )
