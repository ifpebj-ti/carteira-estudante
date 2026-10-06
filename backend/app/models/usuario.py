from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.enums import PerfilOperador


class UsuarioSistema(Base):
    __tablename__ = "usuarios_sistema"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    login = Column(String, unique=True, index=True, nullable=False)
    perfil = Column(
        SQLEnum(PerfilOperador, native_enum=False),
        nullable=False,
        default=PerfilOperador.PORTEIRO,
    )
    status = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
