from sqlalchemy import Column, DateTime, ForeignKey, Integer
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.enums import MovementType


class MovimentacaoPortaria(Base):
    __tablename__ = "movimentacoes_portaria"

    id = Column(Integer, primary_key=True, index=True)
    aluno_id = Column(Integer, ForeignKey("alunos.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios_sistema.id"), nullable=False)
    tipo = Column(SQLEnum(MovementType, native_enum=False), nullable=False)
    data_hora = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    aluno = relationship("Aluno", back_populates="movimentacoes")
    usuario = relationship("UsuarioSistema")
