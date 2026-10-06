from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.routers.auth import router as auth_router
from app.api.routers.health import router as health_router
from app.api.routers.movimentacao import router as movimentacao_router
from app.api.routers.pessoas import router as pessoas_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "API para identificação e controle de acesso dos pessoas internos "
        "do IFPE Campus Belo Jardim."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

app.include_router(health_router)
app.include_router(auth_router, prefix="/api/v1/auth")
app.include_router(pessoas_router, prefix="/api/v1")
app.include_router(movimentacao_router, prefix="/api/v1/movimentacao", tags=["Catraca"])


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return response


@app.get(
    "/",
    summary="Status da API",
    status_code=status.HTTP_200_OK,
    tags=["Root"],
)
def root():

    return {
        "status": "online",
        "message": f"{settings.PROJECT_NAME} está em execução.",
        "docs": "/docs",
        "health": "/health",
    }
