import datetime

import jwt
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from pwdlib.exceptions import UnknownHashError
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.dependencies.security import (
    RoleChecker,
    get_current_person,
    get_current_user,
)
from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password
from app.models.enums import PerfilOperador
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.pessoa import PessoaMeResponse, PessoaResponse
from app.schemas.usuario import UsuarioResponse
from app.services.movimentacao_service import build_person_movement_responses
from app.services.qr_crypto_service import generate_qr_token

router = APIRouter(tags=["Auth"])

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile",
    },
)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _verify_stored_password(plain_password: str, stored_hash: str | None) -> bool:
    if not stored_hash:
        return False
    try:
        return verify_password(plain_password, stored_hash)
    except UnknownHashError:
        return False


def _set_auth_cookie(response: Response, access_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        domain=settings.COOKIE_DOMAIN,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def _find_active_person_by_identifier(db: Session, identifier: str) -> Pessoa | None:
    normalized = identifier.strip()
    if not normalized:
        return None

    person = (
        db.query(Pessoa)
        .filter(Pessoa.matricula == normalized, Pessoa.deleted_at.is_(None))
        .first()
    )
    if person:
        return person

    return (
        db.query(Pessoa)
        .filter(
            func.lower(Pessoa.email) == normalized.lower(),
            Pessoa.deleted_at.is_(None),
        )
        .first()
    )


def _extract_enum_value(value: object) -> str:
    return value.value if hasattr(value, "value") else str(value)


def _issue_login_response(
    account: UsuarioSistema | Pessoa | None,
    password: str,
    response: Response,
    *,
    account_type: str,
    role_attr: str,
    identity_claim: tuple[str, str],
    inactive_detail: str,
) -> TokenResponse:
    if not account or not _verify_stored_password(password, account.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )
    if not account.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=inactive_detail,
        )

    role_value = _extract_enum_value(getattr(account, role_attr))
    claim_key, attr_name = identity_claim
    access_token = create_access_token(
        {
            "sub": str(account.id),
            claim_key: getattr(account, attr_name),
            "role": role_value,
            "account_type": account_type,
        }
    )
    _set_auth_cookie(response, access_token)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",  # noqa: S106
        account_type=account_type,
        role=role_value,
    )


def _authenticate_operator(
    operator: UsuarioSistema, password: str, response: Response
) -> TokenResponse:
    return _issue_login_response(
        operator,
        password,
        response,
        account_type="operador",
        role_attr="perfil",
        identity_claim=("login", "login"),
        inactive_detail="Acesso Negado. Usuário inativo.",
    )


def _authenticate_person(
    person: Pessoa | None, password: str, response: Response
) -> TokenResponse:
    return _issue_login_response(
        person,
        password,
        response,
        account_type="pessoa",
        role_attr="tipo_vinculo",
        identity_claim=("matricula", "matricula"),
        inactive_detail="Acesso Negado. Carteira digital inativa.",
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login manual para operadores e titulares",
)
def login_manual(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    login_id = payload.login.strip()
    if not login_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )

    operator = (
        db.query(UsuarioSistema)
        .filter(
            UsuarioSistema.login == login_id,
            UsuarioSistema.deleted_at.is_(None),
        )
        .first()
    )
    if operator:
        return _authenticate_operator(operator, payload.senha, response)

    person = _find_active_person_by_identifier(db, login_id)
    return _authenticate_person(person, payload.senha, response)


@router.post(
    "/pessoa/login",
    response_model=TokenResponse,
    summary="Login manual exclusivo para titulares da carteira",
)
def login_person(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    person = _find_active_person_by_identifier(db, payload.login)
    return _authenticate_person(person, payload.senha, response)


@router.get("/login/google")
async def login_google(request: Request):
    redirect_uri = request.url_for("auth_callback")

    if settings.ENVIRONMENT == "production":
        redirect_uri = redirect_uri.replace(scheme="https")

    return await oauth.google.authorize_redirect(
        request, str(redirect_uri), prompt="select_account"
    )


@router.get("/callback")
async def auth_callback(
    request: Request, response: Response, db: Session = Depends(get_db)
):
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao obter dados do Google: {str(exc)}",
        )

    if not user_info or not user_info.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não foi possível recuperar o email do Google.",
        )

    email = user_info["email"]
    operator = db.query(UsuarioSistema).filter(UsuarioSistema.login == email).first()

    if not operator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Acesso Negado. Este email não está cadastrado como Operador ou Admin."
            ),
        )

    if not operator.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso Negado. Usuário inativo.",
        )

    access_token = create_access_token(
        {
            "sub": str(operator.id),
            "email": operator.login,
            "perfil": operator.perfil,
            "account_type": "operador",
        }
    )

    frontend_url = f"{settings.FRONTEND_URL.rstrip('/')}/admin"
    redirect_resp = RedirectResponse(url=frontend_url)
    _set_auth_cookie(redirect_resp, access_token)
    return redirect_resp


@router.get("/logout")
async def logout():
    frontend_url = f"{settings.FRONTEND_URL.rstrip('/')}/"
    redirect_resp = RedirectResponse(url=frontend_url)
    redirect_resp.delete_cookie(
        key="access_token",
        httponly=True,
        samesite="lax",
    )
    return redirect_resp


@router.get("/me")
async def get_me(current_user: UsuarioSistema = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "nome": current_user.nome,
        "email": current_user.login,
        "perfil": current_user.perfil,
    }


@router.get(
    "/pessoa/me",
    response_model=PessoaMeResponse,
    summary="Perfil e QR Code dinâmico do titular autenticado",
)
def get_person_me(current_person: Pessoa = Depends(get_current_person)):
    base_data = PessoaResponse.model_validate(current_person).model_dump()
    return PessoaMeResponse(
        **base_data,
        movimentacoes=build_person_movement_responses(current_person.movimentacoes),
        qr_token=generate_qr_token(current_person.id),
        qr_expires_in=settings.QR_CODE_EXPIRE_SECONDS,
    )


@router.get(
    "/usuarios",
    response_model=list[UsuarioResponse],
    summary="Listar operadores do sistema",
    dependencies=[Depends(RoleChecker([PerfilOperador.ADMIN]))],
)
async def list_operators(
    db: Session = Depends(get_db),
    admin_user: UsuarioSistema = Depends(RoleChecker([PerfilOperador.ADMIN])),
):
    operators = db.query(UsuarioSistema).all()
    return operators
