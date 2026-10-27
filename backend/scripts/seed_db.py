import datetime
import os
import sys

# Add the parent directory to the path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.enums import (
    LocalAcesso,
    ModalidadeEnsino,
    PerfilOperador,
    SentidoMovimentacao,
    TipoVinculo,
)
from app.models.movimentacao import Movimentacao
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema


def generate_valid_cpf(idx: int) -> str:
    base_num = 123456700 + idx * 73
    base = [int(c) for c in f"{base_num:09d}"]
    while len(set(base)) == 1:
        base[0] = (base[0] + 1) % 10

    # 1º dígito verificador
    r1 = sum(base[i] * (10 - i) for i in range(9)) % 11
    d1 = 0 if r1 < 2 else 11 - r1
    base.append(d1)

    # 2º dígito verificador
    r2 = sum(base[i] * (11 - i) for i in range(10)) % 11
    d2 = 0 if r2 < 2 else 11 - r2
    base.append(d2)

    return "".join(map(str, base))


CURSO_SIGLAS = {
    "Engenharia de Software": "EW",
    "Informática para Internet": "IN",
    "Agroindústria": "AG",
    "Agropecuária": "AP",
    "Enfermagem": "EN",
    "Análise e Desenvolvimento de Sistemas": "AD",
    "Licenciatura em Música": "MU",
    "Especialização Técnica em Enfermagem do Trabalho": "ET",
    "Pós-Graduação em Enfermagem em Saúde da Família e Comunidade": "ES",
}


def generate_matricula(
    curso: str, sequencial: int, ano: int = 2024, semestre: int = 1
) -> str:
    sigla = CURSO_SIGLAS.get(curso, "XX")
    return f"{ano}{semestre}{sigla}BJ{sequencial:04d}"


def seed():
    print("Iniciando população de dados no banco de dados...")
    db: Session = SessionLocal()

    try:
        # 1. Criar ou Obter Operadores do Sistema
        operadores_data = [
            {
                "nome": "Julia Rocha (Administradora)",
                "login": "admin.julia@ifpe.edu.br",
                "perfil": PerfilOperador.ADMIN,
            },
            {
                "nome": "Marcos Vinícius (Portaria)",
                "login": "porteiro.marcos@ifpe.edu.br",
                "perfil": PerfilOperador.PORTEIRO,
            },
            {
                "nome": "Roberto Antunes (Refeitório)",
                "login": "inspetor.roberto@ifpe.edu.br",
                "perfil": PerfilOperador.INSPETOR_REFEITORIO,
            },
        ]

        operadores = {}
        for op_data in operadores_data:
            op = (
                db.query(UsuarioSistema)
                .filter(UsuarioSistema.login == op_data["login"])
                .first()
            )
            if not op:
                op = UsuarioSistema(
                    nome=op_data["nome"],
                    login=op_data["login"],
                    perfil=op_data["perfil"],
                    status=True,
                )
                db.add(op)
                db.commit()
                db.refresh(op)
                print(f"  + Operador criado: {op.nome} ({op.perfil.value})")
            operadores[op.perfil] = op

        # 2. Lista de Alunos conforme oferta real do IFPE Belo Jardim
        pessoas_seed = [
            # Superiores (Graduação)
            {
                "nome": "Ricardo Oliveira Santos",
                "tipo_vinculo": TipoVinculo.ALUNO,
                "modalidade": ModalidadeEnsino.SUPERIOR,
                "curso": "Engenharia de Software",
                "data_nascimento": datetime.date(2000, 3, 15),
                "status_matricula": "Ativo",
                "is_interno": False,
                "email": "rs1@discente.ifpe.edu.br",
                "foto_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200",
                "status": True,
            },
            {
                "nome": "Gustavo Nogueira de Araújo",
                "tipo_vinculo": TipoVinculo.ALUNO,
                "modalidade": ModalidadeEnsino.SUPERIOR,
                "curso": "Engenharia de Software",
                "data_nascimento": datetime.date(2002, 7, 22),
                "status_matricula": "Ativo",
                "is_interno": False,
                "email": "gna1@discente.ifpe.edu.br",
                "foto_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
                "status": True,
            },
            {
                "nome": "João da Silva",
                "tipo_vinculo": TipoVinculo.ALUNO,
                "modalidade": ModalidadeEnsino.SUPERIOR,
                "curso": "Análise e Desenvolvimento de Sistemas",
                "data_nascimento": datetime.date(2003, 11, 5),
                "status_matricula": "Ativo",
                "is_interno": True,
                "email": "js1@discente.ifpe.edu.br",
                "foto_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
                "status": True,
            },
            {
                "nome": "Thiago Martins Barbosa",
                "tipo_vinculo": TipoVinculo.ALUNO,
                "modalidade": ModalidadeEnsino.SUPERIOR,
                "curso": "Análise e Desenvolvimento de Sistemas",
                "data_nascimento": datetime.date(2001, 8, 3),
                "status_matricula": "Ativo",
                "is_interno": True,
                "email": "tmb1@discente.ifpe.edu.br",
                "foto_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
                "status": True,
            },
            {
                "nome": "Mariana Santos Costa",
                "tipo_vinculo": TipoVinculo.ALUNO,
                "modalidade": ModalidadeEnsino.SUPERIOR,
                "curso": "Licenciatura em Música",
                "data_nascimento": datetime.date(2003, 8, 25),
                "status_matricula": "Ativo",
                "is_interno": False,
                "email": "msc1@discente.ifpe.edu.br",
                "foto_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
                "status": True,
            },
            {
                "nome": "Beatriz Vasconcelos",
                "tipo_vinculo": TipoVinculo.ALUNO,
                "modalidade": ModalidadeEnsino.SUPERIOR,
                "curso": "Licenciatura em Música",
                "data_nascimento": datetime.date(2004, 5, 20),
                "status_matricula": "Ativo",
                "is_interno": False,
                "email": "bv1@discente.ifpe.edu.br",
                "foto_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
                "status": True,
            },
            # Técnicos Integrados ao Ensino Médio
            {
                "nome": "Carlos Eduardo Lima",
                "tipo_vinculo": TipoVinculo.ALUNO,
                "modalidade": ModalidadeEnsino.INTEGRADO,
                "curso": "Agropecuária",
                "data_nascimento": datetime.date(2008, 5, 14),
                "status_matricula": "Ativo",
                "is_interno": True,
                "email": "cel1@discente.ifpe.edu.br",
                "foto_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
                "status": True,
            },
            {
                "nome": "Larissa Cavalcanti",
                "tipo_vinculo": TipoVinculo.ALUNO,
                "modalidade": ModalidadeEnsino.INTEGRADO,
                "curso": "Agroindústria",
                "data_nascimento": datetime.date(2007, 10, 19),
                "status_matricula": "Ativo",
                "is_interno": True,
                "email": "lc1@discente.ifpe.edu.br",
                "foto_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200",
                "status": True,
            },
            {
                "nome": "Pedro Santos",
                "tipo_vinculo": TipoVinculo.ALUNO,
                "modalidade": ModalidadeEnsino.INTEGRADO,
                "curso": "Informática para Internet",
                "data_nascimento": datetime.date(2007, 9, 10),
                "status_matricula": "Suspenso",
                "is_interno": True,
                "email": "ps1@discente.ifpe.edu.br",
                "foto_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200",
                "status": False,
            },
            # Técnicos Subsequentes
            {
                "nome": "Maria Oliveira",
                "tipo_vinculo": TipoVinculo.ALUNO,
                "modalidade": ModalidadeEnsino.SUBSEQUENTE,
                "curso": "Agroindústria",
                "data_nascimento": datetime.date(2001, 4, 18),
                "status_matricula": "Ativo",
                "is_interno": False,
                "email": "mo1@discente.ifpe.edu.br",
                "foto_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200",
                "status": True,
            },
            {
                "nome": "Camila Duarte Nogueira",
                "tipo_vinculo": TipoVinculo.ALUNO,
                "modalidade": ModalidadeEnsino.SUBSEQUENTE,
                "curso": "Agropecuária",
                "data_nascimento": datetime.date(2003, 12, 12),
                "status_matricula": "Ativo",
                "is_interno": False,
                "email": "cdn1@discente.ifpe.edu.br",
                "foto_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
                "status": True,
            },
            {
                "nome": "Ana Beatriz Souza",
                "tipo_vinculo": TipoVinculo.ALUNO,
                "modalidade": ModalidadeEnsino.SUBSEQUENTE,
                "curso": "Enfermagem",
                "data_nascimento": datetime.date(2002, 1, 30),
                "status_matricula": "Inativo",
                "is_interno": False,
                "email": "abs1@discente.ifpe.edu.br",
                "foto_url": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
                "status": False,
            },
            {
                "nome": "Gabriel Henrique Rocha",
                "tipo_vinculo": TipoVinculo.ALUNO,
                "modalidade": ModalidadeEnsino.SUBSEQUENTE,
                "curso": "Informática para Internet",
                "data_nascimento": datetime.date(2002, 3, 29),
                "status_matricula": "Ativo",
                "is_interno": False,
                "email": "ghr1@discente.ifpe.edu.br",
                "foto_url": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200",
                "status": True,
            },
            # Especialização Técnica (Pós-Técnico)
            {
                "nome": "Juliana Ferreira Alves",
                "tipo_vinculo": TipoVinculo.ALUNO,
                "modalidade": ModalidadeEnsino.ESPECIALIZACAO_TECNICA,
                "curso": "Especialização Técnica em Enfermagem do Trabalho",
                "data_nascimento": datetime.date(1997, 6, 17),
                "status_matricula": "Ativo",
                "is_interno": False,
                "email": "jfa1@discente.ifpe.edu.br",
                "foto_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200",
                "status": True,
            },
            # Pós-Graduação (Especialização Lato Sensu)
            {
                "nome": "Lucas Mendes Ribeiro",
                "tipo_vinculo": TipoVinculo.ALUNO,
                "modalidade": ModalidadeEnsino.POS_GRADUACAO,
                "curso": "Pós-Graduação em Enfermagem em Saúde da Família e Comunidade",
                "data_nascimento": datetime.date(1996, 2, 8),
                "status_matricula": "Ativo",
                "is_interno": False,
                "email": "lmr1@discente.ifpe.edu.br",
                "foto_url": "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=200",
                "status": True,
            },
        ]

        curso_sequenciais = {}
        pessoas_instanciadas = {}
        for idx, p_data in enumerate(pessoas_seed):
            curso = p_data["curso"]
            sigla = CURSO_SIGLAS.get(curso, "XX")
            curso_sequenciais[sigla] = curso_sequenciais.get(sigla, 0) + 1
            seq = curso_sequenciais[sigla]
            p_data["matricula"] = generate_matricula(curso, seq)
            p_data["cpf"] = generate_valid_cpf(idx)
            primeiro_nome = p_data["nome"].split()[0].lower()
            status_tag = "ativo" if p_data.get("status", True) else "inativo"
            mat = p_data["matricula"]
            p_data["qr_code_hash"] = f"{mat}-{primeiro_nome}-{status_tag}"

            pessoa = (
                db.query(Pessoa).filter(Pessoa.matricula == mat).first()
                or db.query(Pessoa).filter(Pessoa.cpf == p_data["cpf"]).first()
                or db.query(Pessoa).filter(Pessoa.email == p_data["email"]).first()
            )
            if not pessoa:
                pessoa = Pessoa(**p_data)
                db.add(pessoa)
                db.commit()
                db.refresh(pessoa)
                print(
                    f"  + Pessoa criada: {pessoa.nome} "
                    f"({pessoa.matricula} - {pessoa.curso})"
                )
            else:
                for key, val in p_data.items():
                    setattr(pessoa, key, val)
                db.commit()
                db.refresh(pessoa)
                print(f"  ~ Pessoa atualizada: {pessoa.nome} ({pessoa.matricula})")

            pessoas_instanciadas[pessoa.matricula] = pessoa

        # 3. Gerar Movimentações Realistas
        porteiro = operadores[PerfilOperador.PORTEIRO]
        inspetor = operadores[PerfilOperador.INSPETOR_REFEITORIO]

        # Limpar movimentações de teste anteriores se houver poucas
        total_movs = db.query(Movimentacao).count()
        if total_movs < 10:
            print("Gerando histórico rico de movimentações...")
            now = datetime.datetime.now(datetime.timezone.utc)
            today = now.date()
            yesterday = today - datetime.timedelta(days=1)

            sample_movements = [
                # Movimentações de Hoje
                (
                    "20241EWBJ0001",
                    porteiro.id,
                    SentidoMovimentacao.ENTRADA,
                    LocalAcesso.PORTARIA,
                    datetime.datetime.combine(
                        today,
                        datetime.time(7, 30),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241EWBJ0002",
                    porteiro.id,
                    SentidoMovimentacao.ENTRADA,
                    LocalAcesso.PORTARIA,
                    datetime.datetime.combine(
                        today,
                        datetime.time(7, 45),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241ADBJ0001",
                    inspetor.id,
                    SentidoMovimentacao.ENTRADA,
                    LocalAcesso.REFEITORIO,
                    datetime.datetime.combine(
                        today,
                        datetime.time(8, 0),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241APBJ0001",
                    porteiro.id,
                    SentidoMovimentacao.ENTRADA,
                    LocalAcesso.PORTARIA,
                    datetime.datetime.combine(
                        today,
                        datetime.time(8, 15),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241MUBJ0001",
                    porteiro.id,
                    SentidoMovimentacao.ENTRADA,
                    LocalAcesso.PORTARIA,
                    datetime.datetime.combine(
                        today,
                        datetime.time(9, 10),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241AGBJ0001",
                    inspetor.id,
                    SentidoMovimentacao.ENTRADA,
                    LocalAcesso.REFEITORIO,
                    datetime.datetime.combine(
                        today,
                        datetime.time(11, 45),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241ADBJ0001",
                    inspetor.id,
                    SentidoMovimentacao.ENTRADA,
                    LocalAcesso.REFEITORIO,
                    datetime.datetime.combine(
                        today,
                        datetime.time(12, 0),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241EWBJ0001",
                    porteiro.id,
                    SentidoMovimentacao.SAIDA,
                    LocalAcesso.PORTARIA,
                    datetime.datetime.combine(
                        today,
                        datetime.time(12, 30),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241EWBJ0002",
                    porteiro.id,
                    SentidoMovimentacao.SAIDA,
                    LocalAcesso.PORTARIA,
                    datetime.datetime.combine(
                        today,
                        datetime.time(12, 35),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241EWBJ0001",
                    porteiro.id,
                    SentidoMovimentacao.ENTRADA,
                    LocalAcesso.PORTARIA,
                    datetime.datetime.combine(
                        today,
                        datetime.time(13, 30),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241ETBJ0001",
                    porteiro.id,
                    SentidoMovimentacao.ENTRADA,
                    LocalAcesso.PORTARIA,
                    datetime.datetime.combine(
                        today,
                        datetime.time(13, 50),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241ESBJ0001",
                    porteiro.id,
                    SentidoMovimentacao.ENTRADA,
                    LocalAcesso.PORTARIA,
                    datetime.datetime.combine(
                        today,
                        datetime.time(14, 0),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241MUBJ0001",
                    porteiro.id,
                    SentidoMovimentacao.SAIDA,
                    LocalAcesso.PORTARIA,
                    datetime.datetime.combine(
                        today,
                        datetime.time(16, 45),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241APBJ0001",
                    porteiro.id,
                    SentidoMovimentacao.SAIDA,
                    LocalAcesso.PORTARIA,
                    datetime.datetime.combine(
                        today,
                        datetime.time(17, 10),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241EWBJ0001",
                    porteiro.id,
                    SentidoMovimentacao.SAIDA,
                    LocalAcesso.PORTARIA,
                    datetime.datetime.combine(
                        today,
                        datetime.time(17, 30),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                # Movimentações de Ontem
                (
                    "20241EWBJ0001",
                    porteiro.id,
                    SentidoMovimentacao.ENTRADA,
                    LocalAcesso.PORTARIA,
                    datetime.datetime.combine(
                        yesterday,
                        datetime.time(7, 35),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241EWBJ0002",
                    porteiro.id,
                    SentidoMovimentacao.ENTRADA,
                    LocalAcesso.PORTARIA,
                    datetime.datetime.combine(
                        yesterday,
                        datetime.time(7, 50),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241EWBJ0001",
                    porteiro.id,
                    SentidoMovimentacao.SAIDA,
                    LocalAcesso.PORTARIA,
                    datetime.datetime.combine(
                        yesterday,
                        datetime.time(17, 20),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
                (
                    "20241EWBJ0002",
                    porteiro.id,
                    SentidoMovimentacao.SAIDA,
                    LocalAcesso.PORTARIA,
                    datetime.datetime.combine(
                        yesterday,
                        datetime.time(17, 25),
                        tzinfo=datetime.timezone.utc,
                    ),
                ),
            ]

            for mat, op_id, sentido, local, dt in sample_movements:
                p = pessoas_instanciadas.get(mat)
                if p:
                    mov = Movimentacao(
                        pessoa_id=p.id,
                        operador_id=op_id,
                        tipo=sentido,
                        local_acesso=local,
                        data_hora=dt,
                    )
                    db.add(mov)

            db.commit()
            print(f"  + {len(sample_movements)} movimentações inseridas!")

        print("\n✅ Base de dados populada com sucesso!")
        print(f"   Total de Pessoas: {db.query(Pessoa).count()}")
        print(f"   Total de Usuários: {db.query(UsuarioSistema).count()}")
        print(f"   Total de Movimentações: {db.query(Movimentacao).count()}")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
