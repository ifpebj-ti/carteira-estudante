from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.database import get_db

router = APIRouter(tags=["Health Check"])


@router.get(
    "/health",
    summary="Verificar integridade da API e conexão com o banco de dados",
    status_code=status.HTTP_200_OK,
)
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database": "connected",
            "message": "API e banco de dados operando normalmente."
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "status": "error",
                "database": "disconnected",
                "message": f"Falha na conexão com o banco de dados: {str(exc)}"
            }
        )
