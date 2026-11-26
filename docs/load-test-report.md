# Relatório de Testes de Carga e Análise de Gargalos (k6)

## 1. Visão Geral

Este documento registra a metodologia, as métricas reais coletadas e o diagnóstico de gargalos de concorrência da API **Carteira Estudantil Digital (IFPE Campus Belo Jardim)** utilizando o **Grafana k6**.

O objetivo do ensaio é validar a capacidade da arquitetura atual do backend (`FastAPI` + `Uvicorn` + `SQLAlchemy` + `PostgreSQL 15`) sob carga concorrente moderada (**100 VUs**) e carga extrema de pico (**até 1.000 VUs**), projetando o comportamento e os pontos críticos de saturação para o ambiente de produção hospedado na **Oracle Cloud Free Tier**.

---

## 2. Ambiente, Contexto de Produção e Metodologia

### 2.1 Arquitetura da Stack Avaliada (Docker Compose)

Os testes foram executados contra a stack containerizada oficial do projeto sem alterações no código-fonte:

| Componente | Imagem / Configuração Atual | Parâmetros Relevantes de Concorrência |
| :--- | :--- | :--- |
| **API Backend** | `python:3.11-slim` (`uvicorn app.main:app`) | **1 processo worker** Uvicorn; threadpool síncrono padrão AnyIO (`40` threads) |
| **Pool ORM** | `SQLAlchemy 2.x` + `psycopg 3` (`QueuePool`) | Configuração padrão sem tuning explícito: `pool_size=5`, `max_overflow=10` (**máx. 15 conexões**), `pool_timeout=30s`, `pool_pre_ping=True` |
| **Banco de Dados** | `postgres:15-alpine` | `max_connections=100` (padrão PostgreSQL) |
| **Gerador de Carga** | `grafana/k6:latest` (via Docker `--network host`) | Script [backend/tests/load/load_test.js](../backend/tests/load/load_test.js) |

> **Implicação para Produção (Oracle Cloud Free Tier):** Em instâncias gratuitas da Oracle Cloud (como `VM.Standard.E2.1.Micro` com 1/8 OCPU e 1 GB RAM, ou `VM.Standard.A1.Flex` ARM Ampere compartilhando até 4 OCPUs e 24 GB RAM entre proxy reverso, frontend Next.js, backend FastAPI e PostgreSQL), gargalos de bloqueio de threads, contenção de pool de conexões e custo de CPU em hashing `bcrypt` manifestam-se ainda mais cedo do que em bancada local, tornando os limites estruturais identificados neste teste decisivos para disponibilidade em horários de pico na portaria/refeitório.

### 2.2 Endpoints Avaliados e Mix de Tráfego

Na etapa `setup()`, o script valida a saúde da API e, quando as credenciais de teste são informadas via variáveis de ambiente (`STUDENT_LOGIN`, `STUDENT_PASSWORD`, `ADMIN_LOGIN`, `ADMIN_PASSWORD`), obtém tokens JWT reais para exercitar as rotas autenticadas (caso omitidas, o script degrada de forma segura testando apenas `GET /health`, sem credenciais *hardcoded* no código). Cada iteração executa uma requisição ponderada refletindo o padrão de uso real do campus:

- **45% — `GET /health`**: validação de disponibilidade com consulta `SELECT 1` ao PostgreSQL via `Depends(get_db)`.
- **35% — `GET /api/v1/auth/pessoa/me`**: rota autenticada do estudante (decodificação JWT + busca ORM em `pessoas` + carregamento de `movimentacoes` + emissão de `qr_token` dinâmico assinado).
- **15% — `GET /api/v1/pessoas/{matricula}`**: consulta cadastral detalhada com histórico de movimentações e vínculo com operadores.
- **5% — `POST /api/v1/auth/pessoa/login`**: autenticação manual com verificação de hash `bcrypt` (`pwdlib[bcrypt]`) e emissão de JWT/cookie.

Cada iteração aplica `sleep(0.2)` (200 ms de *think time* simulado) e *timeout* por requisição de `10s`.

### 2.3 Cenários Configurados e Critérios de Aceite (`thresholds`)

Os dois cenários foram executados em sequência no mesmo ensaio (com janela de 5s de drenagem entre eles para evitar contaminação de métricas):

1. **`baseline_100_concurrent` (Carga Moderada — 35s):**
   - Rampa `0 -> 100 VUs` em `10s`, sustentação em `100 VUs` por `20s`, rampa de descida `100 -> 0 VUs` em `5s`.
2. **`stress_peak_1000_concurrent` (Estresse / Pico — 55s, início em `t=40s`):**
   - Rampa `0 -> 300 VUs` em `15s`, escalada `300 -> 1.000 VUs` em `15s`, sustentação em `1.000 VUs` por `15s`, descida `1.000 -> 0 VUs` em `10s`.

**Thresholds definidos:**
- Taxa global e de baseline de falhas HTTP: `rate < 0.05` (`< 5%`)
- Latência `p(95)` em leituras (`health`, `person_me`, `person_detail` e `baseline`): `p(95) < 500ms`
- Latência `p(95)` em login com `bcrypt` (`person_login`): `p(95) < 2000ms`

### 2.4 Comando para Reproduzir o Teste

Preencha as variáveis opcionais de teste de carga no seu `.env` local (conforme documentado no `.env.example`: `BASE_URL`, `STUDENT_LOGIN`, `STUDENT_PASSWORD`, `ADMIN_LOGIN`, `ADMIN_PASSWORD`) e, com os serviços `db` e `backend` em execução, rode:

```bash
docker compose up -d db backend
docker run --rm --network host --env-file .env -i grafana/k6 run - < backend/tests/load/load_test.js
```

Também é possível informar as variáveis diretamente na linha de comando (ou omiti-las para exercitar apenas `GET /health`):

```bash
docker run --rm --network host \
  -e BASE_URL="http://localhost:8000" \
  -e STUDENT_LOGIN="<MATRICULA_ESTUDANTE_TESTE>" \
  -e STUDENT_PASSWORD="<SENHA_ESTUDANTE_TESTE>" \
  -e ADMIN_LOGIN="<LOGIN_ADMIN_TESTE>" \
  -e ADMIN_PASSWORD="<SENHA_ADMIN_TESTE>" \
  -i grafana/k6 run - < backend/tests/load/load_test.js
```

---

## 3. Resultados Observados

### 3.1 Comparativo entre Cenários (100 VUs vs. 1.000 VUs)

| Métrica | Cenário 1: Baseline (`100 VUs`) | Cenário 2: Pico/Estresse (`1.000 VUs`) | Consolidado Geral (`99,1s`) |
| :--- | :---: | :---: | :---: |
| **Total de Requisições** | `12.663` | `5.613` | `18.279` *(inclui 3 reqs de setup)* |
| **Throughput Efetivo na Janela** | **`~361,8 req/s`** *(em 35s)* | **`~95,1 req/s`** *(queda severa sob contenção)* | `184,51 req/s` |
| **Taxa de Falha (`req_failed`)** | **`0,00%`** (`0 / 12.663`) ✅ | **`56,28%`** (`3.159 / 5.613`) ❌ | `17,28%` (`3.159 / 18.279`) ❌ |
| **Latência Média (`avg`)** | **`17,25 ms`** | `5.630,00 ms` (`5,63 s`) | `1.740,00 ms` (`1,74 s`) |
| **Latência Mediana (`med` / `p50`)** | **`3,70 ms`** | `10.000,00 ms` *(timeout)* | `6,30 ms` |
| **Latência `p(90)`** | **`33,95 ms`** | `10.000,00 ms` *(timeout)* | `10.000,00 ms` |
| **Latência `p(95)`** | **`165,04 ms`** ✅ | `10.000,00 ms` *(timeout)* ❌ | `10.000,00 ms` ❌ |
| **Latência Máxima (`max`)** | **`228,17 ms`** | `10.000,00 ms` *(timeout)* | `10.000,00 ms` |
| **Status dos Thresholds** | **Aprovado (`100%`)** | **Saturado (acima da capacidade atual)** | `exit code 99` (limiares cruzados no pico) |

> Nota: considerando exclusivamente as **15.120 respostas HTTP 200 bem-sucedidas** ao longo de todo o teste (`{expected_response:true}`), as latências foram `avg = 17,97 ms`, `med = 3,90 ms`, `p(90) = 38,40 ms`, `p(95) = 164,57 ms` e `max = 230,71 ms`.

### 3.2 Desempenho por Endpoint (Consolidado)

| Endpoint | Sucesso (`checks`) | `min` | `med` (`p50`) | `avg` (com pico) | `p(95)` (com pico) | Observação Técnica |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `GET /health` | `82,3%` (`6.867 / 8.339`) | `0,47 ms` | `2,52 ms` | `1,76 s` | `10,00 s` | Rápido sob 100 VUs, mas bloqueado pelo mesmo pool `get_db()` no pico |
| `GET /api/v1/auth/pessoa/me` | `82,8%` (`5.224 / 6.308`) | `1,32 ms` | `7,80 ms` | `1,72 s` | `10,00 s` | 2 queries ORM (`pessoas` + `movimentacoes`) + assinatura JWT do QR |
| `GET /api/v1/pessoas/{matricula}` | `83,3%` (`2.230 / 2.676`) | `1,88 ms` | `12,24 ms` | `1,68 s` | `10,00 s` | Maior payload JSON e junção com operadores das movimentações |
| `POST /api/v1/auth/pessoa/login` | `83,5%` (`796 / 953`) | `163,23 ms` | `170,76 ms` | `1,79 s` | `10,00 s` | **Custo mínimo fixo ~170 ms** devido ao `bcrypt` síncrono em CPU |

---

## 4. Análise de Gargalos

### 4.1 Ponto Exato de Inflexão (`~150 a 169 VUs`)

A telemetria segundo a segundo do k6 revelou que o sistema **não degradou de forma linear**, mas sofreu um **bloqueio abrupto (*cliff collapse*)** quando a rampa do Cenário 2 cruzou **~150–169 VUs concorrentes**:

- Até `t = 48s` (`149 VUs`), o backend processava cerca de **`554 iter/s`** (`14.522 -> 15.076` iterações completas em 1s).
- Em `t = 49s` (`169 VUs`), o contador de iterações concluídas **travou em `15.117`** por vários segundos consecutivos, derrubando a vazão útil de `~362–550 req/s` para `0 req/s` até o estouro dos timeouts.

### 4.2 Gargalo Primário (Crítico): Exaustão do `QueuePool` SQLAlchemy + Contenção do Threadpool Síncrono AnyIO

A inspeção dos logs do container `carteira_backend` durante o pico capturou a exceção exata responsável pelo travamento:

```text
File "/opt/venv/lib/python3.11/site-packages/starlette/concurrency.py", line 34, in run_in_threadpool
  return await anyio.to_thread.run_sync(func)
...
File "/opt/venv/lib/python3.11/site-packages/sqlalchemy/pool/impl.py", line 165, in _do_get
  raise exc.TimeoutError(
sqlalchemy.exc.TimeoutError: QueuePool limit of size 5 overflow 10 reached, connection timed out, timeout 30.00
```

**Por que a vazão colapsou ao ultrapassar ~150 VUs?**
1. Todas as rotas, dependências de autenticação (`get_current_person` / `get_current_actor`) e `get_db()` em `app/core/database.py` são **síncronas** (`def`), sendo despachadas pelo FastAPI/Starlette para o **threadpool padrão do AnyIO (`40` worker threads por processo Uvicorn)**.
2. O `create_engine(settings.DATABASE_URL, pool_pre_ping=True)` utiliza os valores padrão do SQLAlchemy: **`pool_size=5` + `max_overflow=10` = máximo de `15` conexões simultâneas** com `pool_timeout=30s`.
3. Quando uma requisição autenticada executa `get_current_person` / `get_current_actor` dentro de `solve_dependencies`, o SQLAlchemy abre transação (`autobegin`) e **retém uma das `15` conexões do `QueuePool` presa àquela `Session`** até o término do endpoint e a execução do `finally: db.close()` (que também exige adquirir uma thread livre no pool de `40` threads do AnyIO).
4. Sob alta concorrência (`>150 VUs`), `15` requisições em andamento retêm todas as `15` conexões do banco enquanto aguardam na fila do AnyIO uma thread livre para concluir o endpoint e rodar `db.close()`; simultaneamente, **todas as `40` threads do AnyIO são ocupadas por novas requisições bloqueadas dentro de `QueuePool._do_get(timeout=30.0)`** esperando uma conexão ser devolvida — gerando *deadlock/starvation* mútuo entre o pool de threads (`40`) e o pool de conexões (`15`)!
5. Enquanto isso, o container `carteira_db` (`PostgreSQL 15`) permaneceu ocioso e saudável (`healthy`), recebendo no máximo 15 conexões ativas (de um limite padrão de 100).

### 4.3 Gargalo Secundário: Processo Único do Uvicorn (`--workers 1`)

O `Dockerfile` de produção inicia `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000` com **apenas 1 processo Python**:
- Limita o uso de CPU a um único interpretador (sujeito ao GIL do Python em código CPU-bound como validação Pydantic, serialização JSON e assinatura/verificação JWT).
- Limita todo o servidor a apenas `40` threads síncronas e `15` conexões de banco.

### 4.4 Gargalo Terciário: Custo de CPU do `bcrypt` com Sessão de Banco Aberta

No endpoint `POST /api/v1/auth/pessoa/login` (e `/api/v1/auth/login`):
- Mesmo sem contenção, a mediana de resposta foi **`170,76 ms`** (vs. `2,52 ms` em `/health`), consumidos quase integralmente pelo cálculo de `bcrypt` (`verify_password`).
- Como `db: Session = Depends(get_db)` mantém a transação/conexão do SQLAlchemy emprestada **durante os ~170 ms do `bcrypt`**, apenas 15 logins simultâneos são capazes de reter 100% do `QueuePool` do banco enquanto queimam CPU — um vetor clássico de negação de serviço (DoS acidental ou intencional) em instâncias pequenas da **Oracle Cloud Free Tier**.

---

## 5. Sugestões de Melhorias Arquiteturais Futuras (Priorizadas para Oracle Cloud Free Tier)

### Prioridade P0 — Eliminar o Deadlock entre Threadpool e `QueuePool` (Impacto Alto / Custo Zero de Infra)
1. **Migrar `database.py` e `get_db()` para `AsyncEngine` / `AsyncSession` (`sqlalchemy.ext.asyncio`):**
   - O driver `psycopg==3.3.9` já instalado no projeto suporta modo nativo assíncrono (`postgresql+psycopg_async://` ou `create_async_engine` com `postgresql+psycopg://`).
   - Com sessões assíncronas no *event loop*, a liberação de conexões não disputa threads com requisições entrantes, eliminando a estagnação observada em `169 VUs` sem aumentar o consumo de RAM na VM gratuita.
2. **Ajustar explicitamente os parâmetros do Pool em `create_engine` (solução imediata enquanto síncrono):**
   - Configurar `pool_size=20`, `max_overflow=25` (garantindo que `pool_size + max_overflow >= 40`, isto é, nunca inferior ao limite de 40 threads do AnyIO por worker) e reduzir `pool_timeout=5` para *fail-fast* em vez de travar threads por `30s`.

### Prioridade P1 — Múltiplos Workers Uvicorn Dimensionados à VM Oracle
1. **Configurar `--workers` proporcional às OCPUs disponíveis na VM:**
   - Em uma instância Ampere A1 (`2` a `4` OCPUs na Oracle Free Tier), executar **2 a 3 workers** Uvicorn (`--workers 2`), dimensionando o pool para respeitar `(pool_size + max_overflow) * workers <= 80` (deixando margem segura abaixo do `max_connections=100` do PostgreSQL).
2. **Desacoplar `GET /health` de checagens pesadas em probes de alta frequência:**
   - Manter `/health/live` leve (sem banco) para *liveness probes* frequentes e reservar a query `SELECT 1` para `/health/ready` (*readiness*).

### Prioridade P2 — Proteção contra Exaustão de CPU e Conexões no Login (`bcrypt`)
1. **Aplicar Rate Limiting nos endpoints `/api/v1/auth/login` e `/api/v1/auth/pessoa/login`:**
   - Configurar `limit_req_zone` no proxy reverso (Nginx) ou middleware `slowapi` (ex.: `5–10 req/min` por IP) para impedir que rajadas de login saturem as OCPUs da Oracle Cloud Free Tier.
2. **Liberar a conexão do banco antes de executar `verify_password`:**
   - Buscar apenas `(id, senha_hash, status, ...)` no banco, encerrar/devolver a conexão ao pool e executar a validação `bcrypt` em thread dedicada (`anyio.to_thread.run_sync`) com semáforo de concorrência máxima (ex.: máx. 4 hashes simultâneos), preservando conexões livres para leituras da catraca e carteiras digitais.

### Prioridade P3 — Cache de Leitura e Otimização de Consultas (Médio Prazo)
1. **Eager Loading (`selectinload` / `joinedload`) em `Pessoa.movimentacoes`:**
   - Evitar *lazy-loading* adicional ao serializar `GET /api/v1/auth/pessoa/me` e `GET /api/v1/pessoas/{matricula}`, além de limitar o histórico retornado na carteira mobile às últimas `N` movimentações (ex.: `LIMIT 20`) com índice composto `(pessoa_id, data_hora DESC)`.
2. **Cache em memória com TTL curto (ou Redis leve):**
   - Cachear por `15–30s` os metadados cadastrais imutáveis do titular em `GET /api/v1/auth/pessoa/me`, reduzindo drasticamente leituras repetitivas no PostgreSQL em horários de fila na entrada do campus.
