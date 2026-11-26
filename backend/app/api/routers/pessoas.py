from io import BytesIO
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
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from app.api.dependencies.security import (
    RoleChecker,
    get_current_actor,
    verify_person_read_access,
    verify_photo_upload_access,
)
from app.core.config import settings
from app.core.database import get_db
from app.core.upload import read_upload_file_with_limit
from app.models.enums import PerfilOperador
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema
from app.schemas.pessoa import PessoaDetailResponse, PessoaResponse, PessoaUpdate
from app.services.movimentacao_service import (
    build_movement_responses,
    build_person_movement_responses,
)
from app.services.photo_upload_service import process_photo_upload_in_background
from app.services.upload_service import (
    ALLOWED_UPLOAD_EXTENSIONS,
    process_upload_in_background,
)

ALLOWED_PHOTO_EXTENSIONS = frozenset({".jpg", ".jpeg", ".png", ".webp"})
ALLOWED_PHOTO_CONTENT_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
ALLOWED_PHOTO_FORMATS = frozenset({"JPEG", "PNG", "WEBP"})
MAX_PHOTO_PIXELS = 25_000_000
PHOTO_FORMAT_METADATA: dict[str, tuple[str, str]] = {
    "JPEG": (".jpg", "image/jpeg"),
    "PNG": (".png", "image/png"),
    "WEBP": (".webp", "image/webp"),
}

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


def validate_photo_image_bytes(file_bytes: bytes) -> str:
    """Decode uploaded bytes with Pillow and enforce allowed raster formats."""
    try:
        with Image.open(BytesIO(file_bytes)) as image:
            detected_format = (image.format or "").upper()
            width, height = image.size
            image.verify()
    except (
        UnidentifiedImageError,
        Image.DecompressionBombError,
        OSError,
        SyntaxError,
        ValueError,
        EOFError,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupted image file.",
        ) from exc

    if detected_format not in ALLOWED_PHOTO_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image format. Allowed: JPEG, PNG, WEBP.",
        )

    if width * height > MAX_PHOTO_PIXELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image dimensions exceed the maximum allowed resolution.",
        )

    try:
        with Image.open(BytesIO(file_bytes)) as image:
            image.load()
    except (
        UnidentifiedImageError,
        Image.DecompressionBombError,
        OSError,
        SyntaxError,
        ValueError,
        EOFError,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupted image file.",
        ) from exc

    return detected_format


@router.post(
    "/{pessoa_id}/photo",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Async profile photo upload",
    dependencies=[Depends(verify_photo_upload_access)],
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

    filename, _ = _validate_photo_metadata(file)
    file_bytes = await read_upload_file_with_limit(
        file,
        settings.MAX_PHOTO_UPLOAD_BYTES,
        empty_detail="Uploaded image file is empty.",
        too_large_detail="Uploaded image exceeds the 5 MB size limit.",
    )
    detected_format = validate_photo_image_bytes(file_bytes)
    canonical_extension, canonical_content_type = PHOTO_FORMAT_METADATA[detected_format]
    canonical_filename = f"{Path(filename).stem or 'photo'}{canonical_extension}"

    background_tasks.add_task(
        process_photo_upload_in_background,
        person.id,
        file_bytes,
        canonical_filename,
        canonical_content_type,
    )
    return {"message": "Photo upload received and processing started in background"}


@router.post(
    "/upload",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload em lote de pessoas (CSV, XLSX ou Parquet)",
    dependencies=[Depends(RoleChecker([PerfilOperador.ADMIN]))],
)
async def upload_people(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> dict[str, str]:
    filename = (file.filename or "").strip()
    file_extension = Path(filename).suffix.lower()
    if file_extension not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de arquivo inválido. Envie .csv, .xlsx ou .parquet.",
        )

    file_bytes = await file.read()
    await file.close()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O arquivo enviado está vazio.",
        )

    background_tasks.add_task(process_upload_in_background, file_bytes, filename)
    return {"message": "Upload recebido e processamento iniciado em background"}


@router.get(
    "",
    response_model=list[PessoaResponse],
    dependencies=[Depends(RoleChecker([PerfilOperador.ADMIN]))],
)
def list_people(
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
def get_person_by_matricula(
    person: Pessoa = Depends(verify_person_read_access),
    actor: UsuarioSistema | Pessoa = Depends(get_current_actor),
) -> PessoaDetailResponse:
    movement_responses = (
        build_person_movement_responses(person.movimentacoes)
        if isinstance(actor, Pessoa)
        else build_movement_responses(person.movimentacoes)
    )

    return PessoaDetailResponse(
        id=person.id,
        matricula=person.matricula,
        nome=person.nome,
        cpf=person.cpf,
        tipo_vinculo=person.tipo_vinculo,
        modalidade=person.modalidade,
        curso=person.curso,
        data_nascimento=person.data_nascimento,
        status_matricula=person.status_matricula,
        is_interno=person.is_interno,
        email=person.email,
        foto_url=person.foto_url,
        status=person.status,
        qr_code_hash=person.qr_code_hash,
        created_at=person.created_at,
        updated_at=person.updated_at,
        movimentacoes=movement_responses,
    )


@router.patch(
    "/{matricula}",
    response_model=PessoaResponse,
    dependencies=[Depends(RoleChecker([PerfilOperador.ADMIN]))],
)
def update_person(
    matricula: str,
    person_in: PessoaUpdate,
    db: Session = Depends(get_db),
):
    person = (
        db.query(Pessoa)
        .filter(Pessoa.matricula == matricula, Pessoa.deleted_at.is_(None))
        .first()
    )
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não encontrado"
        )

    update_data = person_in.model_dump(exclude_unset=True)

    for non_nullable in ("nome", "cpf", "tipo_vinculo"):
        if non_nullable in update_data and update_data[non_nullable] is None:
            del update_data[non_nullable]

    if "cpf" in update_data and update_data["cpf"] != person.cpf:
        existing_by_cpf = (
            db.query(Pessoa)
            .filter(Pessoa.cpf == update_data["cpf"], Pessoa.id != person.id)
            .first()
        )
        if existing_by_cpf:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe uma pessoa cadastrada com este CPF.",
            )

    if (
        "email" in update_data
        and update_data["email"] is not None
        and update_data["email"] != person.email
    ):
        existing_by_email = (
            db.query(Pessoa)
            .filter(Pessoa.email == update_data["email"], Pessoa.id != person.id)
            .first()
        )
        if existing_by_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe uma pessoa cadastrada com este e-mail.",
            )

    for field, value in update_data.items():
        setattr(person, field, value)

    db.commit()
    db.refresh(person)
    return person
