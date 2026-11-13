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
    pessoa: Pessoa,
    movement_type: SentidoMovimentacao | str,
    request: ScanRequest,
    *,
    access_granted: bool,
    created_at: datetime.datetime,
) -> ScanResponse:
    return ScanResponse(
        student_name=pessoa.nome,
        student_photo_url=pessoa.foto_url,
        student_tipo_vinculo=pessoa.tipo_vinculo,
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
def list_movimentacoes_historico(
    limit: int = Query(default=30, ge=1, le=100),
    current_user: UsuarioSistema = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MovimentacaoHistoricoItem]:
    """Retorna as movimentações mais recentes para exibição no leitor da portaria."""
    movs = (
        db.query(Movimentacao)
        .options(joinedload(Movimentacao.pessoa))
        .order_by(Movimentacao.data_hora.desc())
        .limit(limit)
        .all()
    )
    return [
        MovimentacaoHistoricoItem(
            id=mov.id,
            pessoa_id=mov.pessoa_id,
            tipo=mov.tipo,
            local_acesso=mov.local_acesso,
            data_hora=mov.data_hora,
            pessoa_nome=mov.pessoa.nome if mov.pessoa else "Pessoa removida",
            pessoa_tipo_vinculo=mov.pessoa.tipo_vinculo if mov.pessoa else None,
        )
        for mov in movs
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
    # 1. Decode JWT (Raises 400 if expired or invalid)
    pessoa_id = decode_qr_token(request.qr_code_hash)

    # 2. Fetch Pessoa (ignora registros removidos logicamente)
    pessoa = (
        db.query(Pessoa)
        .filter(Pessoa.id == pessoa_id, Pessoa.deleted_at.is_(None))
        .first()
    )
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
        expected_movement = determine_next_movement_type(pessoa, db)
        return _build_scan_response(
            pessoa,
            expected_movement,
            request,
            access_granted=False,
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
    return _build_scan_response(
        pessoa,
        movement_type,
        request,
        access_granted=True,
        created_at=nova_movimentacao.data_hora,
    )
