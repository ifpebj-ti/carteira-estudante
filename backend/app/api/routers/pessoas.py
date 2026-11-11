from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies.security import RoleChecker
from app.core.database import get_db
from app.models.enums import PerfilOperador
from app.models.pessoa import Pessoa
from app.schemas.movimentacao import MovimentacaoResponse
from app.schemas.pessoa import PessoaDetailResponse, PessoaResponse, PessoaUpdate

router = APIRouter(prefix="/pessoas", tags=["Pessoas"])


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

    movs_response = []
    for mov in pessoa.movimentacoes:
        operador_nome = mov.operador.nome if mov.operador else "Desconhecido"
        movs_response.append(
            MovimentacaoResponse(
                id=mov.id,
                pessoa_id=mov.pessoa_id,
                operador_id=mov.operador_id,
                tipo=mov.tipo,
                local_acesso=mov.local_acesso,
                data_hora=mov.data_hora,
                operador_nome=operador_nome,
            )
        )

    movs_response.sort(key=lambda x: x.data_hora, reverse=True)

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
