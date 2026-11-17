import datetime

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.enums import SentidoMovimentacao
from app.models.movimentacao import Movimentacao
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema
from app.schemas.movimentacao import (
    MovimentacaoHistoricoItem,
    ScanRequest,
    ScanResponse,
)
from app.services.movimentacao_service import (
    determine_next_movement_type,
    validate_student_status,
)
from app.services.qr_crypto_service import decode_qr_token

router = APIRouter()


def _build_scan_response(
    person: Pessoa,
    movement_type: SentidoMovimentacao | str,
    request: ScanRequest,
    *,
    access_granted: bool,
    created_at: datetime.datetime,
) -> ScanResponse:
    return ScanResponse(
        student_name=person.nome,
        student_photo_url=person.foto_url,
        student_tipo_vinculo=person.tipo_vinculo,
        movement_type=movement_type,
        local_acesso=request.local_acesso,
        status=access_granted,
        created_at=created_at,
    )


@router.get(
    "/historico",
    response_model=list[MovimentacaoHistoricoItem],
    summary="Listar histórico recente de movimentações",
)
def list_movement_history(
    limit: int = Query(default=30, ge=1, le=100),
    current_user: UsuarioSistema = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MovimentacaoHistoricoItem]:
    movements = (
        db.query(Movimentacao)
        .options(joinedload(Movimentacao.pessoa))
        .order_by(Movimentacao.data_hora.desc())
        .limit(limit)
        .all()
    )
    return [
        MovimentacaoHistoricoItem(
            id=movement.id,
            pessoa_id=movement.pessoa_id,
            tipo=movement.tipo,
            local_acesso=movement.local_acesso,
            data_hora=movement.data_hora,
            pessoa_nome=movement.pessoa.nome if movement.pessoa else "Pessoa removida",
            pessoa_tipo_vinculo=(
                movement.pessoa.tipo_vinculo if movement.pessoa else None
            ),
        )
        for movement in movements
    ]


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
    person_id = decode_qr_token(request.qr_code_hash)

    person = (
        db.query(Pessoa)
        .filter(Pessoa.id == person_id, Pessoa.deleted_at.is_(None))
        .first()
    )
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pessoa não encontrado.",
        )

    try:
        validate_student_status(person)
    except HTTPException:
        # Gatekeeper UI renders an access-denied screen with status=False on payload.
        expected_movement = determine_next_movement_type(person, db)
        return _build_scan_response(
            person,
            expected_movement,
            request,
            access_granted=False,
            created_at=datetime.datetime.now(datetime.timezone.utc),
        )

    movement_type = determine_next_movement_type(person, db)

    new_movement = Movimentacao(
        pessoa_id=person.id,
        operador_id=current_user.id,
        tipo=movement_type,
        local_acesso=request.local_acesso,
    )
    db.add(new_movement)
    db.commit()
    db.refresh(new_movement)

    return _build_scan_response(
        person,
        movement_type,
        request,
        access_granted=True,
        created_at=new_movement.data_hora,
    )
