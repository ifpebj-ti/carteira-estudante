from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.pessoa import Pessoa
from app.schemas.movimentacao import MovimentacaoResponse
from app.schemas.pessoa import PessoaDetailResponse

router = APIRouter(prefix="/pessoas", tags=["Pessoas"])


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
