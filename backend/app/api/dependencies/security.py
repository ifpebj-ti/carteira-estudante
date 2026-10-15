from collections.abc import Sequence
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.enums import PerfilOperador
from app.models.usuario import UsuarioSistema


def get_current_user(request: Request, db: Session = Depends(get_db)) -> UsuarioSistema:
    """
    Extrai e valida o token JWT dos cookies da requisição.
    Retorna o usuário logado (UsuarioSistema).
    """
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado. Faça login para acessar este recurso.",
        )

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas.",
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido.",
        )

    usuario = db.query(UsuarioSistema).filter(UsuarioSistema.id == int(user_id)).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado.",
        )
    if not usuario.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo.",
        )

    return usuario


class RoleChecker:
    """
    Dependência de segurança para controle de acesso baseado em papéis (RBAC).
    Verifica se o usuário autenticado possui um dos perfis permitidos.
    """

    def __init__(self, allowed_roles: Sequence[PerfilOperador] | list[PerfilOperador]):
        self.allowed_roles = allowed_roles

    def __call__(
        self, current_user: UsuarioSistema = Depends(get_current_user)
    ) -> UsuarioSistema:
        user_role = (
            current_user.perfil.value
            if hasattr(current_user.perfil, "value")
            else current_user.perfil
        )
        allowed_values = {
            r.value if hasattr(r, "value") else r for r in self.allowed_roles
        }

        if user_role not in allowed_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: privilégios insuficientes",
            )
        return current_user


def get_current_active_admin(
    current_user: UsuarioSistema = Depends(RoleChecker([PerfilOperador.ADMIN])),
) -> UsuarioSistema:
    """
    Verifica se o usuário logado tem o perfil de ADMIN.
    """
    return current_user
