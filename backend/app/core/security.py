from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher

password_hash = PasswordHash((BcryptHasher(),))


def get_password_hash(password: str) -> str:
    """Gera o hash bcrypt para uma senha em texto puro."""
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se uma senha em texto puro corresponde ao hash armazenado."""
    return password_hash.verify(plain_password, hashed_password)
