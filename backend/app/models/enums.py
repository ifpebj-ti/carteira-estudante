from enum import Enum


class TipoVinculo(str, Enum):
    ALUNO = "ALUNO"
    PROFESSOR = "PROFESSOR"
    SERVIDOR = "SERVIDOR"
    COORDENACAO = "COORDENACAO"


class ModalidadeEnsino(str, Enum):
    INTEGRADO = "INTEGRADO"
    SUBSEQUENTE = "SUBSEQUENTE"
    SUPERIOR = "SUPERIOR"


class LocalAcesso(str, Enum):
    PORTARIA = "PORTARIA"
    REFEITORIO = "REFEITORIO"


class PerfilOperador(str, Enum):
    PORTEIRO = "PORTEIRO"
    INSPETOR_REFEITORIO = "INSPETOR_REFEITORIO"
    ADMIN = "ADMIN"


class SentidoMovimentacao(str, Enum):
    ENTRADA = "ENTRADA"
    SAIDA = "SAIDA"
