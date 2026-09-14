from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "API - Carteira Estudantil IFPE"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "postgresql://postgres:ifpe123@db:5432/carteira_estudantil"
    SECRET_KEY: str = "super_secret_key_for_dev_only"  # noqa: S105
    ALGORITHM: str = "HS256"
    QR_CODE_EXPIRE_SECONDS: int = 60

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
