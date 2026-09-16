import datetime

from fastapi import HTTPException, status
import jwt 
from jwt.exceptions import InvalidTokenError

from app.core.config import settings


def generate_qr_token(aluno_id: int) -> str:
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        seconds=settings.QR_CODE_EXPIRE_SECONDS
    )
    to_encode = {"sub": str(aluno_id), "exp": expire}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_qr_token(token: str) -> int:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        aluno_id: str = payload.get("sub")
        if aluno_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid QR Code payload.",
            )
        return int(aluno_id)
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="QR Code expired or invalid.",
        )
