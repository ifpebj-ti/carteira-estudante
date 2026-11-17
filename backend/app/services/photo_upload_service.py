import logging

from app.core.database import SessionLocal
from app.models.pessoa import Pessoa
from app.services.storage_service import upload_photo_to_storage

if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)


def process_photo_upload_in_background(
    person_id: int,
    file_bytes: bytes,
    filename: str,
    content_type: str = "image/jpeg",
) -> None:
    """Upload a photo to object storage and save its URL in a fresh DB session."""
    logger.info("Starting background photo upload for person_id=%s.", person_id)
    with SessionLocal() as db_session:
        try:
            person = (
                db_session.query(Pessoa)
                .filter(Pessoa.id == person_id, Pessoa.deleted_at.is_(None))
                .first()
            )
            if not person:
                logger.error(
                    "Skipping background photo upload: person_id=%s not found.",
                    person_id,
                )
                return

            photo_url = upload_photo_to_storage(
                file_bytes=file_bytes,
                filename=filename,
                content_type=content_type,
            )
            person.foto_url = photo_url
            db_session.commit()
            logger.info(
                "Photo upload completed for person_id=%s.",
                person_id,
            )
        except Exception as exc:
            db_session.rollback()
            logger.error(
                "Failed background photo upload for person_id=%s: %s",
                person_id,
                exc,
            )
