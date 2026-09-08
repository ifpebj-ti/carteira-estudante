from fastapi import FastAPI, status

from app.api.routers.alunos import router as alunos_router
from app.api.routers.health import router as health_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "API para identificação e controle de acesso dos alunos internos "
        "do IFPE Campus Belo Jardim."
    ),
    version="1.0.0",
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(alunos_router, prefix="/api/v1")


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
