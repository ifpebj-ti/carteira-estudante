from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "API - Carteira Estudantil IFPE"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = (
        "postgresql://postgres:ifpe123@db:5432/carteira_estudantil"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
