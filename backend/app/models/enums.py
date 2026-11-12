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
    QUALIFICACAO_PROFISSIONAL = "QUALIFICACAO_PROFISSIONAL"
    POS_GRADUACAO = "POS_GRADUACAO"
    ESPECIALIZACAO_TECNICA = "ESPECIALIZACAO_TECNICA"


class LocalAcesso(str, Enum):
    PORTARIA = "PORTARIA"


class PerfilOperador(str, Enum):
    PORTEIRO = "PORTEIRO"
    ADMIN = "ADMIN"


class SentidoMovimentacao(str, Enum):
    ENTRADA = "ENTRADA"
    SAIDA = "SAIDA"
