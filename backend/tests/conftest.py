import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app

# Troca o banco de dados principal por '_test' (ex: carteira_estudantil_test).
# make_url preserva usuário, senha, host e parâmetros (ex: ?sslmode=require).
_main_url = make_url(settings.DATABASE_URL)
TEST_DATABASE_URL = _main_url.set(database=f"{_main_url.database}_test")

test_engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def _ensure_test_database_exists() -> None:
    """
    Cria o banco de testes caso ele ainda não exista.
    Conecta no banco de manutenção 'postgres', pois não é possível
    criar um banco estando conectado a ele.
    """
    db_name = TEST_DATABASE_URL.database
    admin_engine = create_engine(
        TEST_DATABASE_URL.set(database="postgres"),
        isolation_level="AUTOCOMMIT",  # CREATE DATABASE não roda dentro de transação
    )
    try:
        with admin_engine.connect() as conn:
            exists = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"),
                {"name": db_name},
            ).scalar()
            if not exists:
                quoted_name = admin_engine.dialect.identifier_preparer.quote(db_name)
                conn.execute(text(f"CREATE DATABASE {quoted_name}"))
    finally:
        admin_engine.dispose()


@pytest.fixture(scope="session", autouse=True)
def create_test_database():
    import app.models  # noqa: F401

    _ensure_test_database_exists()

    # Drop e Create apenas no banco de TESTES
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    # Limpa as tabelas ao finalizar
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


@pytest.fixture
def db_session():
    # Cria sessão do banco de TESTES para ser usada nos testes locais (db_session)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(db_session):
    # Força a API a usar o banco de testes quando chamada pelo TestClient
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
