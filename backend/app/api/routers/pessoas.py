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
from app.services.movimentacao_service import build_movement_responses
from app.services.upload_service import (
    ALLOWED_UPLOAD_EXTENSIONS,
    process_upload_in_background,
)

router = APIRouter(prefix="/pessoas", tags=["Pessoas"])


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
def get_person_by_matricula(matricula: str, db: Session = Depends(get_db)):
    person = (
        db.query(Pessoa)
        .filter(Pessoa.matricula == matricula, Pessoa.deleted_at.is_(None))
        .first()
    )
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não encontrado"
        )

    movement_responses = build_movement_responses(person.movimentacoes)

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
        deleted_at=person.deleted_at,
        movimentacoes=movement_responses,
    )


@router.patch(
    "/{matricula}",
    response_model=PessoaResponse,
    dependencies=[Depends(RoleChecker([PerfilOperador.ADMIN]))],
)
def update_person(
    matricula: str,
    pessoa_in: PessoaUpdate,
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

    update_data = pessoa_in.model_dump(exclude_unset=True)

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
