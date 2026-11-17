from collections.abc import Sequence
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.enums import PerfilOperador
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema


def _extract_token(request: Request) -> str:
    token: Optional[str] = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        bearer_token = auth_header.removeprefix("Bearer ").strip()
        if bearer_token:
            token = bearer_token

    if not token:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado. Faça login para acessar este recurso.",
        )
    return token


def _decode_token_payload(request: Request) -> tuple[dict, int]:
    token = _extract_token(request)
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        subject_id: Optional[str] = payload.get("sub")
        if subject_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas.",
            )
        parsed_id = int(subject_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado.",
        )
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido.",
        )
    return payload, parsed_id


def get_current_user(request: Request, db: Session = Depends(get_db)) -> UsuarioSistema:
    payload, user_id = _decode_token_payload(request)
    account_type = payload.get("account_type")
    if account_type == "pessoa":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: privilégios insuficientes",
        )
    if account_type not in (None, "operador"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido.",
        )
    # Prevent unscoped tokens (e.g. dynamic QR tokens) from acting as operators.
    if account_type is None and not (payload.get("role") or payload.get("perfil")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido.",
        )

    operator = (
        db.query(UsuarioSistema)
        .filter(UsuarioSistema.id == user_id, UsuarioSistema.deleted_at.is_(None))
        .first()
    )
    if not operator:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado.",
        )
    if not operator.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo.",
        )

    return operator


def get_current_person(request: Request, db: Session = Depends(get_db)) -> Pessoa:
    payload, person_id = _decode_token_payload(request)
    account_type = payload.get("account_type")
    if account_type == "operador" or (
        account_type is None and (payload.get("role") or payload.get("perfil"))
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a titulares da carteira.",
        )
    if account_type != "pessoa":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido.",
        )

    person = (
        db.query(Pessoa)
        .filter(Pessoa.id == person_id, Pessoa.deleted_at.is_(None))
        .first()
    )
    if not person:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Titular não encontrado.",
        )
    if not person.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Carteira digital inativa.",
        )

    return person


class RoleChecker:
    """FastAPI dependency enforcing operator role membership."""

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
    return current_user
