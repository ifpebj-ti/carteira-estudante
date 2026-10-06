import datetime

import jwt
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.usuario import UsuarioSistema

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


@router.get("/login/google")
async def login_google(request: Request):
    """
    Redireciona para o login do Google
    """
    # redirect_uri deve ser a rota callback do nosso próprio backend
    redirect_uri = request.url_for("auth_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


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

    # Frontend URL de redirecionamento (ex: http://localhost:3000/admin/leitor)
    # Por padrão, vamos jogar na raiz do admin no Next.js
    frontend_url = "http://127.0.0.1:3000/admin"

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


@router.get("/me")
async def get_me(current_user: UsuarioSistema = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "nome": current_user.nome,
        "email": current_user.login,
        "perfil": current_user.perfil,
    }
