from pathlib import Path

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.dependencies.security import RoleChecker
from app.core.database import get_db
from app.models.enums import PerfilOperador
from app.models.pessoa import Pessoa
from app.schemas.pessoa import PessoaDetailResponse, PessoaResponse, PessoaUpdate
from app.services.movimentacao_service import build_movimentacao_responses
from app.services.photo_upload_service import process_photo_upload_in_background

ALLOWED_PHOTO_EXTENSIONS = frozenset({".jpg", ".jpeg", ".png", ".webp"})
ALLOWED_PHOTO_CONTENT_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024

router = APIRouter(prefix="/pessoas", tags=["Pessoas"])


def _validate_photo_metadata(file: UploadFile) -> tuple[str, str]:
    filename = (file.filename or "").strip()
    file_extension = Path(filename).suffix.lower()
    if file_extension not in ALLOWED_PHOTO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image extension. Allowed: .jpg, .jpeg, .png, .webp.",
        )

    content_type = (file.content_type or "").split(";", 1)[0].strip().lower()
    if content_type not in ALLOWED_PHOTO_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image content type.",
        )
    return filename, content_type


@router.post(
    "/{pessoa_id}/photo",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Async profile photo upload",
    dependencies=[Depends(RoleChecker([PerfilOperador.ADMIN]))],
)
async def upload_photo(
    pessoa_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Validate an uploaded photo and enqueue storage upload in the background."""
    person = (
        db.query(Pessoa)
        .filter(Pessoa.id == pessoa_id, Pessoa.deleted_at.is_(None))
        .first()
    )
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person not found.",
        )

    filename, content_type = _validate_photo_metadata(file)
    file_bytes = await file.read()
    await file.close()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image file is empty.",
        )
    if len(file_bytes) > MAX_PHOTO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image exceeds the 5 MB size limit.",
        )

    background_tasks.add_task(
        process_photo_upload_in_background,
        person.id,
        file_bytes,
        filename,
        content_type,
    )
    return {"message": "Photo upload received and processing started in background"}


@router.get(
    "",
    response_model=list[PessoaResponse],
    dependencies=[Depends(RoleChecker([PerfilOperador.ADMIN]))],
)
def list_pessoas(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return (
        db.query(Pessoa)
        .filter(Pessoa.deleted_at.is_(None))
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{matricula}", response_model=PessoaDetailResponse)
def get_pessoa_by_matricula(matricula: str, db: Session = Depends(get_db)):
    pessoa = (
        db.query(Pessoa)
        .filter(Pessoa.matricula == matricula, Pessoa.deleted_at.is_(None))
        .first()
    )
    if not pessoa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não encontrado"
        )

    movs_response = build_movimentacao_responses(pessoa.movimentacoes)

    return PessoaDetailResponse(
        id=pessoa.id,
        matricula=pessoa.matricula,
        nome=pessoa.nome,
        cpf=pessoa.cpf,
        tipo_vinculo=pessoa.tipo_vinculo,
        modalidade=pessoa.modalidade,
        curso=pessoa.curso,
        data_nascimento=pessoa.data_nascimento,
        status_matricula=pessoa.status_matricula,
        is_interno=pessoa.is_interno,
        email=pessoa.email,
        foto_url=pessoa.foto_url,
        status=pessoa.status,
        qr_code_hash=pessoa.qr_code_hash,
        created_at=pessoa.created_at,
        updated_at=pessoa.updated_at,
        deleted_at=pessoa.deleted_at,
        movimentacoes=movs_response,
    )


@router.patch(
    "/{matricula}",
    response_model=PessoaResponse,
    dependencies=[Depends(RoleChecker([PerfilOperador.ADMIN]))],
)
def update_pessoa(
    matricula: str,
    pessoa_in: PessoaUpdate,
    db: Session = Depends(get_db),
):
    pessoa = (
        db.query(Pessoa)
        .filter(Pessoa.matricula == matricula, Pessoa.deleted_at.is_(None))
        .first()
    )
    if not pessoa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não encontrado"
        )

    update_data = pessoa_in.model_dump(exclude_unset=True)

    for non_nullable in ("nome", "cpf", "tipo_vinculo"):
        if non_nullable in update_data and update_data[non_nullable] is None:
            del update_data[non_nullable]

    if "cpf" in update_data and update_data["cpf"] != pessoa.cpf:
        cpf_existente = (
            db.query(Pessoa)
            .filter(Pessoa.cpf == update_data["cpf"], Pessoa.id != pessoa.id)
            .first()
        )
        if cpf_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe uma pessoa cadastrada com este CPF.",
            )

    if (
        "email" in update_data
        and update_data["email"] is not None
        and update_data["email"] != pessoa.email
    ):
        email_existente = (
            db.query(Pessoa)
            .filter(Pessoa.email == update_data["email"], Pessoa.id != pessoa.id)
            .first()
        )
        if email_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe uma pessoa cadastrada com este e-mail.",
            )

    for field, value in update_data.items():
        setattr(pessoa, field, value)

    db.commit()
    db.refresh(pessoa)
    return pessoa
