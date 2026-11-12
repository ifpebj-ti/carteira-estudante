import datetime

import jwt
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from pwdlib.exceptions import UnknownHashError
from sqlalchemy.orm import Session

from app.api.dependencies.security import RoleChecker, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password
from app.models.enums import PerfilOperador
from app.models.usuario import UsuarioSistema
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.usuario import UsuarioResponse

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


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login manual para operadores",
)
def login_manual(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Autentica um operador cadastrado em `usuarios_sistema` via login e senha.
    Retorna o token JWT e define o cookie HttpOnly de sessão.
    """
    usuario = (
        db.query(UsuarioSistema)
        .filter(
            UsuarioSistema.login == payload.login,
            UsuarioSistema.deleted_at.is_(None),
        )
        .first()
    )

    password_valid = False
    if usuario and usuario.senha_hash:
        try:
            password_valid = verify_password(payload.senha, usuario.senha_hash)
        except UnknownHashError:
            password_valid = False

    if not usuario or not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )

    if not usuario.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso Negado. Usuário inativo.",
        )

    role_value = (
        usuario.perfil.value
        if hasattr(usuario.perfil, "value")
        else str(usuario.perfil)
    )
    access_token = create_access_token(
        {
            "sub": str(usuario.id),
            "login": usuario.login,
            "role": role_value,
        }
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return TokenResponse(access_token=access_token, token_type="bearer")  # noqa: S106


@router.get("/login/google")
async def login_google(request: Request):
    """
    Redireciona para o login do Google
    """
    # redirect_uri deve ser a rota callback do nosso próprio backend
    redirect_uri = request.url_for("auth_callback")
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
        {"sub": str(usuario.id), "email": usuario.login, "perfil": usuario.perfil}
    )

    # Redireciona para o frontend padronizado (ex: http://localhost:3000/admin)
    frontend_url = f"{settings.FRONTEND_URL.rstrip('/')}/admin"

    redirect_resp = RedirectResponse(url=frontend_url)

    # Injetando o JWT num cookie HttpOnly para segurança
    redirect_resp.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",  # Permite envio via redirecionamentos cross-origin
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return redirect_resp


@router.get("/logout")
async def logout():
    """
    Rota para deslogar o usuário.
    Deleta o cookie 'access_token' e redireciona para a página de login.
    """
    frontend_url = "http://localhost:3000/"
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
