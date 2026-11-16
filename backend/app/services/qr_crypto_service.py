import datetime

import jwt
from fastapi import HTTPException, status

from app.core.config import settings


def generate_qr_token(person_id: int) -> str:
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        seconds=settings.QR_CODE_EXPIRE_SECONDS
    )
    to_encode = {"sub": str(person_id), "exp": expire}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_qr_token(token: str) -> int:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        # Reject session tokens so login JWTs cannot be replayed as dynamic QR tokens.
        if (
            payload.get("account_type") is not None
            or payload.get("role") is not None
            or payload.get("perfil") is not None
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Forged or invalid QR Code.",
            )
        person_id: str | None = payload.get("sub")
        if person_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid QR Code payload.",
            )
        return int(person_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="QR Code expired. Please generate a new one.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Forged or invalid QR Code.",
        )
