from app.core.database import SessionLocal
from app.models.aluno import Aluno
from app.models.usuario import UsuarioSistema
from app.services.qr_crypto_service import generate_qr_token

def main():
    from app.core.database import engine
    from app.core.database import Base
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    aluno = db.query(Aluno).first()
    if not aluno:
        aluno = Aluno(id=1, matricula="TEST123", nome_completo="Aluno Teste", curso="Informática", qr_code_hash="xxx")
        db.add(aluno)
    operador = db.query(UsuarioSistema).first()
    if not operador:
        operador = UsuarioSistema(id=1, nome="Admin", login="admin@test.com", perfil="ADMIN")
        db.add(operador)
    db.commit()

    import datetime, jwt
    from app.core.config import settings
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)
    to_encode = {"sub": str(aluno.id), "exp": expire}
    token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    print("----- START TOKEN -----")
    print(token)
    print("----- END TOKEN -----")
    print(f"Token gerado para o aluno: {aluno.nome_completo}")

if __name__ == "__main__":
    main()
