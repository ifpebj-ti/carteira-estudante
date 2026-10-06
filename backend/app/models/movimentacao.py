from sqlalchemy import Column, DateTime, ForeignKey, Integer
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.enums import LocalAcesso, SentidoMovimentacao


class Movimentacao(Base):
    __tablename__ = "movimentacoes"

    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(Integer, ForeignKey("pessoas.id"), nullable=False)
    operador_id = Column(Integer, ForeignKey("usuarios_sistema.id"), nullable=False)
    local_acesso = Column(SQLEnum(LocalAcesso, native_enum=False), nullable=False)
    tipo = Column(SQLEnum(SentidoMovimentacao, native_enum=False), nullable=False)
    data_hora = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    pessoa = relationship("Pessoa", back_populates="movimentacoes")
    operador = relationship("UsuarioSistema")
