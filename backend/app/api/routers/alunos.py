from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.aluno import Aluno
from app.schemas.aluno import AlunoDetailResponse
from app.schemas.movimentacao import MovimentacaoResponse

router = APIRouter(prefix="/alunos", tags=["Alunos"])


@router.get("/{matricula}", response_model=AlunoDetailResponse)
def get_aluno_by_matricula(matricula: str, db: Session = Depends(get_db)):
    aluno = db.query(Aluno).filter(Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado"
        )

    movs_response = []
    for mov in aluno.movimentacoes:
        operador_nome = mov.usuario.nome if mov.usuario else "Desconhecido"
        movs_response.append(
            MovimentacaoResponse(
                id=mov.id,
                aluno_id=mov.aluno_id,
                usuario_id=mov.usuario_id,
                tipo=mov.tipo,
                data_hora=mov.data_hora,
                operador_nome=operador_nome,
            )
        )

    movs_response.sort(key=lambda x: x.data_hora, reverse=True)

    return AlunoDetailResponse(
        id=aluno.id,
        matricula=aluno.matricula,
        nome_completo=aluno.nome_completo,
        curso=aluno.curso,
        modalidade=aluno.modalidade,
        idade=aluno.idade,
        email=aluno.email,
        foto_url=aluno.foto_url,
        status=aluno.status,
        qr_code_hash=aluno.qr_code_hash,
        created_at=aluno.created_at,
        movimentacoes=movs_response,
    )
