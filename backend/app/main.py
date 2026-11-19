from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

app.include_router(health_router)
app.include_router(auth_router, prefix="/api/v1/auth")
app.include_router(pessoas_router, prefix="/api/v1")
app.include_router(movimentacao_router, prefix="/api/v1/movimentacao", tags=["Catraca"])

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
(STATIC_DIR / "photos").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    if request.url.path.startswith("/static/"):
        response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"
        response.headers["Cache-Control"] = "public, max-age=86400"
    else:
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
