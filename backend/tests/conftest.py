import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app

# Troca o banco de dados principal por '_test' (ex: carteira_estudantil_test)
TEST_DATABASE_URL = settings.DATABASE_URL + "_test"

test_engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def create_test_database():
    import app.models  # noqa: F401

    # Drop e Create apenas no banco de TESTES
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    # Limpa as tabelas ao finalizar
    Base.metadata.drop_all(bind=test_engine)


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
    # Faz com que a API FastAPI real utilize o banco de testes quando chamada via cliente
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
