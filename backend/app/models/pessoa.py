from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.enums import ModalidadeEnsino, TipoVinculo


class Pessoa(Base):
    __tablename__ = "pessoas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    matricula = Column(String, unique=True, index=True, nullable=False)
    tipo_vinculo = Column(SQLEnum(TipoVinculo, native_enum=False), nullable=False)
    modalidade = Column(SQLEnum(ModalidadeEnsino, native_enum=False), nullable=True)
    is_interno = Column(Boolean, default=False)

    # Optional fields from existing Pessoa model to keep the app working
    email = Column(String, unique=True, index=True, nullable=True)
    foto_url = Column(String, nullable=True)
    qr_code_hash = Column(String, unique=True, index=True, nullable=True)
    status = Column(Boolean, default=True)  # Soft delete
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    movimentacoes = relationship("Movimentacao", back_populates="pessoa")
