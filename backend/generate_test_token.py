import datetime

import jwt

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.models.enums import TipoVinculo
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    pessoa = db.query(Pessoa).first()
    if not pessoa:
        pessoa = Pessoa(
            id=1,
            matricula="TEST123",
            nome="Pessoa Teste",
            tipo_vinculo=TipoVinculo.ALUNO,
            qr_code_hash="xxx",
        )
        db.add(pessoa)
    operador = db.query(UsuarioSistema).first()
    if not operador:
        operador = UsuarioSistema(
            id=1, nome="Admin", login="admin@test.com", perfil="ADMIN"
        )
        db.add(operador)
    db.commit()

    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)
    to_encode = {"sub": str(pessoa.id), "exp": expire}
    token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    print("----- START TOKEN -----")
    print(token)
    print("----- END TOKEN -----")
    print(f"Token gerado para o pessoa: {pessoa.nome}")


if __name__ == "__main__":
    main()
