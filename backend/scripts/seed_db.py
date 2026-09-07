import os
import sys

# Add the parent directory to the path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.usuario import UsuarioSistema
from app.models.aluno import Aluno
from app.models.movimentacao import MovimentacaoPortaria
from app.core.config import settings

def seed():
    print("Criando tabelas no banco de dados...")
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    # Verifica se já existe
    aluno = db.query(Aluno).filter(Aluno.matricula == "2024010582").first()
    if aluno:
        print("Dados de teste já existem. Pulando seeder.")
        db.close()
        return

    print("Inserindo dados de teste...")
    
    # Criar Operador
    operador = UsuarioSistema(
        nome="Admin Julia",
        login="admin.julia",
        senha_hash="hash_ficticio",
        perfil="PORTARIA"
    )
    db.add(operador)
    db.commit()
    db.refresh(operador)

    # Criar Aluno
    aluno = Aluno(
        matricula="2024010582",
        nome_completo="Ricardo Oliveira Santos",
        curso="Engenharia de Software",
        modalidade="Superior",
        idade=26,
        email="rs1@discente.ifpe.edu.br",
        senha_hash="hash_ficticio",
        qr_code_hash="2024010582-ricardo-ativo",
        status=True,
    )
    db.add(aluno)
    db.commit()
    db.refresh(aluno)

    # Criar Movimentações
    mov1 = MovimentacaoPortaria(
        aluno_id=aluno.id,
        usuario_id=operador.id,
        tipo="ENTRADA"
    )
    mov2 = MovimentacaoPortaria(
        aluno_id=aluno.id,
        usuario_id=operador.id,
        tipo="SAIDA"
    )
    
    db.add(mov1)
    db.add(mov2)
    db.commit()
    
    print("Banco populado com sucesso!")
    db.close()

if __name__ == "__main__":
    seed()
