import os
import sys

# Add the parent directory to the path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session

from app.core.database import Base, SessionLocal, engine
from app.models.enums import (
    LocalAcesso,
    ModalidadeEnsino,
    SentidoMovimentacao,
    TipoVinculo,
)
from app.models.movimentacao import Movimentacao
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema


def seed():
    print("Criando tabelas no banco de dados...")
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()

    # Verifica se já existe
    pessoa = db.query(Pessoa).filter(Pessoa.matricula == "2024010582").first()
    if pessoa:
        print("Dados de teste já existem. Pulando seeder.")
        db.close()
        return

    print("Inserindo dados de teste...")

    # Criar Operador
    operador = UsuarioSistema(
        nome="Admin Julia",
        login="admin.julia",
        perfil="PORTARIA",
    )
    db.add(operador)
    db.commit()
    db.refresh(operador)

    # Criar Pessoa
    pessoa = Pessoa(
        matricula="2024010582",
        nome="Ricardo Oliveira Santos",
        tipo_vinculo=TipoVinculo.ALUNO,
        modalidade=ModalidadeEnsino.SUPERIOR,
        is_interno=False,
        email="rs1@discente.ifpe.edu.br",
        qr_code_hash="2024010582-ricardo-ativo",
        status=True,
    )
    db.add(pessoa)
    db.commit()
    db.refresh(pessoa)

    # Criar Movimentações
    if not db.query(Movimentacao).first():
        mov1 = Movimentacao(
            pessoa_id=pessoa.id,
            operador_id=operador.id,
            tipo=SentidoMovimentacao.ENTRADA,
            local_acesso=LocalAcesso.PORTARIA,
        )
        mov2 = Movimentacao(
            pessoa_id=pessoa.id,
            operador_id=operador.id,
            tipo=SentidoMovimentacao.SAIDA,
            local_acesso=LocalAcesso.PORTARIA,
        )

    db.add(mov1)
    db.add(mov2)
    db.commit()

    print("Banco populado com sucesso!")
    db.close()


if __name__ == "__main__":
    seed()
