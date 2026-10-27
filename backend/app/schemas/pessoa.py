import re
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import ModalidadeEnsino, TipoVinculo
from app.schemas.movimentacao import MovimentacaoResponse


class PessoaBase(BaseModel):
    matricula: str
    nome: str
    cpf: str
    tipo_vinculo: TipoVinculo = TipoVinculo.ALUNO
    modalidade: Optional[ModalidadeEnsino] = None
    curso: Optional[str] = None
    data_nascimento: Optional[date] = None
    status_matricula: Optional[str] = "Ativo"
    is_interno: bool = False
    email: Optional[str] = None
    foto_url: Optional[str] = None
    status: bool = True

    @field_validator("cpf")
    @classmethod
    def validate_cpf(cls, v: str) -> str:
        # a) Remove qualquer pontuação (pontos e traços), deixando apenas números
        clean_cpf = re.sub(r"\D", "", v)

        # b) Verifica se tem exatamente 11 dígitos
        if len(clean_cpf) != 11:
            raise ValueError("O CPF deve conter exatamente 11 dígitos.")

        # c) Rejeita CPFs com todos os números iguais (ex: 111.111.111-11)
        if clean_cpf == clean_cpf[0] * 11:
            raise ValueError("CPF inválido: todos os dígitos são iguais.")

        # d) Calcula e valida matematicamente o primeiro e o segundo dígito verificador
        resto_1 = sum(int(clean_cpf[i]) * (10 - i) for i in range(9)) % 11
        digito_1 = 0 if resto_1 < 2 else 11 - resto_1
        if int(clean_cpf[9]) != digito_1:
            raise ValueError("CPF inválido: primeiro dígito verificador incorreto.")

        resto_2 = sum(int(clean_cpf[i]) * (11 - i) for i in range(10)) % 11
        digito_2 = 0 if resto_2 < 2 else 11 - resto_2
        if int(clean_cpf[10]) != digito_2:
            raise ValueError("CPF inválido: segundo dígito verificador incorreto.")

        # e) Retorna o CPF limpo (apenas números) em caso de sucesso
        return clean_cpf


class PessoaCreate(PessoaBase):
    senha: Optional[str] = None
    qr_code_hash: Optional[str] = None


class PessoaResponse(PessoaBase):
    id: int
    qr_code_hash: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PessoaDetailResponse(PessoaResponse):
    movimentacoes: List[MovimentacaoResponse] = []
