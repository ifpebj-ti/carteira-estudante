from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Aluno(Base):
    __tablename__ = "alunos"

    id = Column(Integer, primary_key=True, index=True)
    matricula = Column(String, unique=True, index=True, nullable=False)
    nome_completo = Column(String, nullable=False)
    curso = Column(String, nullable=False)
    modalidade = Column(String)
    idade = Column(Integer)
    email = Column(String, unique=True, index=True)
    foto_url = Column(String)
    senha_hash = Column(String, nullable=False)
    qr_code_hash = Column(String, unique=True, index=True, nullable=False)
    status = Column(Boolean, default=True)  # Soft delete
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    movimentacoes = relationship("MovimentacaoPortaria", back_populates="aluno")
