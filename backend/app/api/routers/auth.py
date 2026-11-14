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
    get_current_pessoa,
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
from app.services.movimentacao_service import build_pessoa_movimentacao_responses
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
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def _verify_stored_password(plain_password: str, stored_hash: str | None) -> bool:
    """Verifica senha contra hash armazenado com proteção contra hashes ausentes."""
    if not stored_hash:
        return False
    try:
        return verify_password(plain_password, stored_hash)
    except UnknownHashError:
        return False


def _set_auth_cookie(response: Response, access_token: str) -> None:
    """Define o cookie HttpOnly de sessão na resposta HTTP."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        domain=settings.COOKIE_DOMAIN,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def _find_active_pessoa_by_identifier(db: Session, identifier: str) -> Pessoa | None:
    """Busca titular ativo por matrícula exata ou e-mail (case-insensitive)."""
    normalized = identifier.strip()
    if not normalized:
        return None

    pessoa = (
        db.query(Pessoa)
        .filter(Pessoa.matricula == normalized, Pessoa.deleted_at.is_(None))
        .first()
    )
    if pessoa:
        return pessoa

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
    senha: str,
    response: Response,
    *,
    account_type: str,
    role_attr: str,
    identity_claim: tuple[str, str],
    inactive_detail: str,
) -> TokenResponse:
    """Valida senha e status da conta e emite JWT + cookie HttpOnly de sessão."""
    if not account or not _verify_stored_password(senha, account.senha_hash):
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
    usuario: UsuarioSistema, senha: str, response: Response
) -> TokenResponse:
    return _issue_login_response(
        usuario,
        senha,
        response,
        account_type="operador",
        role_attr="perfil",
        identity_claim=("login", "login"),
        inactive_detail="Acesso Negado. Usuário inativo.",
    )


def _authenticate_pessoa(
    pessoa: Pessoa | None, senha: str, response: Response
) -> TokenResponse:
    return _issue_login_response(
        pessoa,
        senha,
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
    """
    Autentica operadores (`usuarios_sistema`) por login/senha ou titulares
    (`pessoas`) por matrícula/e-mail e senha quando não houver operador com o login.
    Retorna o token JWT e define o cookie HttpOnly de sessão.
    """
    login_id = payload.login.strip()
    if not login_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )

    usuario = (
        db.query(UsuarioSistema)
        .filter(
            UsuarioSistema.login == login_id,
            UsuarioSistema.deleted_at.is_(None),
        )
        .first()
    )
    if usuario:
        return _authenticate_operator(usuario, payload.senha, response)

    pessoa = _find_active_pessoa_by_identifier(db, login_id)
    return _authenticate_pessoa(pessoa, payload.senha, response)


@router.post(
    "/pessoa/login",
    response_model=TokenResponse,
    summary="Login manual exclusivo para titulares da carteira",
)
def login_pessoa(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Autentica explicitamente uma conta institucional da tabela `pessoas`
    (Aluno, Professor, Servidor ou Coordenação) por matrícula ou e-mail e senha.
    """
    pessoa = _find_active_pessoa_by_identifier(db, payload.login)
    return _authenticate_pessoa(pessoa, payload.senha, response)


@router.get("/login/google")
async def login_google(request: Request):
    """
    Redireciona para o login do Google
    """
    # redirect_uri deve ser a rota callback do nosso próprio backend
    redirect_uri = request.url_for("auth_callback")
    
    if settings.ENVIRONMENT == "production":
        redirect_url = redirect_url.replace(scheme="https")

    return await oauth.google.authorize_redirect(
        request, redirect_uri, prompt="select_account"
    )


@router.get("/callback")
async def auth_callback(
    request: Request, response: Response, db: Session = Depends(get_db)
):
    """
    Rota de retorno do Google após a autenticação.
    Valida o usuário no banco e injeta o cookie de sessão.
    """
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao obter dados do Google: {str(e)}",
        )

    if not user_info or not user_info.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não foi possível recuperar o email do Google.",
        )

    email = user_info["email"]

    # Verifica se o email está cadastrado em usuarios_sistema
    usuario = db.query(UsuarioSistema).filter(UsuarioSistema.login == email).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Acesso Negado. Este email não está cadastrado como Operador ou Admin."
            ),
        )

    if not usuario.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso Negado. Usuário inativo.",
        )

    # Gera token de acesso JWT interno
    access_token = create_access_token(
        {
            "sub": str(usuario.id),
            "email": usuario.login,
            "perfil": usuario.perfil,
            "account_type": "operador",
        }
    )

    # Redireciona para o frontend padronizado (ex: http://localhost:3000/admin)
    frontend_url = f"{settings.FRONTEND_URL.rstrip('/')}/admin"

    redirect_resp = RedirectResponse(url=frontend_url)

    # Injetando o JWT num cookie HttpOnly para segurança
    _set_auth_cookie(redirect_resp, access_token)

    return redirect_resp


@router.get("/logout")
async def logout():
    """
    Rota para deslogar o usuário.
    Deleta o cookie 'access_token' e redireciona para a página de login.
    """
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
def get_pessoa_me(current_pessoa: Pessoa = Depends(get_current_pessoa)):
    """
    Retorna os dados da conta institucional autenticada (`Pessoa`) sem `senha_hash`
    junto com um token de QR Code dinâmico pronto para exibição na carteira digital.
    """
    base_data = PessoaResponse.model_validate(current_pessoa).model_dump()
    return PessoaMeResponse(
        **base_data,
        movimentacoes=build_pessoa_movimentacao_responses(current_pessoa.movimentacoes),
        qr_token=generate_qr_token(current_pessoa.id),
        qr_expires_in=settings.QR_CODE_EXPIRE_SECONDS,
    )


@router.get(
    "/usuarios",
    response_model=list[UsuarioResponse],
    summary="Listar operadores do sistema",
    dependencies=[Depends(RoleChecker([PerfilOperador.ADMIN]))],
)
async def list_usuarios(
    db: Session = Depends(get_db),
    admin_user: UsuarioSistema = Depends(RoleChecker([PerfilOperador.ADMIN])),
):
    """
    Lista todos os operadores e administradores cadastrados no sistema.
    Acesso restrito exclusivamente para usuários com perfil ADMIN.
    """
    usuarios = db.query(UsuarioSistema).all()
    return usuarios
