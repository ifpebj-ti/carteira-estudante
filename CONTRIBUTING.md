# Contribuindo com o Carteira do Estudante

Abra uma issue com contexto e critérios de aceite antes de mudanças amplas. Para bugs, informe componente, versão, reprodução e logs sem dados pessoais.

## Branches, commits e revisão

Crie uma branch a partir da `main` atualizada do repositório de destino. Use nomes como `feat/student-search`, `fix/login-validation`, `ci/container-scan` ou `docs/contributing`. Abra PRs pequenos e descreva problema, solução e evidências pelo template.

Use Conventional Commits nos commits e no título do PR: `feat(api): adiciona consulta de movimentações`, `fix(frontend): corrige validação do login` ou `ci: restringe permissões de publicação`. Em squash merges, preserve esse padrão na mensagem final.

Aguarde a CI e a revisão do mantenedor. `CODEOWNERS` identifica o responsável; exigir aprovação e impedir merge com falhas depende de configurar regras de proteção no GitHub. Na configuração dos checks obrigatórios, selecione o check final **CI gate** exibido na execução.

No fork, `origin` deve apontar para sua conta e `upstream` para o projeto institucional. Confira explicitamente o repositório base do PR.

## Desenvolvimento local

O backend usa Python 3.11 e uv; o frontend usa Node.js 24 e npm. Os lockfiles fazem parte da alteração de dependências: atualize `backend/uv.lock` com uv e `frontend/package-lock.json` com npm. A CI rejeita um lockfile Python incompatível com o manifesto.

Para a aplicação, configure um `.env` local a partir de `.env.example` e use `docker compose up --build`. Não publique o arquivo de ambiente.

### Testes em banco descartável

A fixture de pytest executa `drop_all` e `create_all`. **Nunca aponte os testes para bancos de desenvolvimento com dados importantes, homologação ou produção.**

Use o Compose exclusivo dos testes, que não monta os volumes da aplicação nem expõe o banco:

```bash
docker compose -p carteira-tests -f .github/compose.ci.yml up --build --abort-on-container-exit --exit-code-from backend-tests
docker compose -p carteira-tests -f .github/compose.ci.yml down --volumes
```

O código de saída do primeiro comando é o resultado dos testes. Execute a limpeza mesmo se os testes falharem.

Outras verificações:

```bash
cd backend
uv sync --locked
uv run --no-sync ruff check .
```

```bash
cd frontend
npm ci
npm audit --audit-level=high
npm exec -- next typegen
npm exec -- tsc --noEmit --incremental false
npm run build
```

O frontend não possui script de lint; TypeScript e build são verificações reais e não equivalem a ESLint.

## Segurança e evidências

Não inclua tokens, senhas, dados de estudantes ou QR codes válidos em arquivos, issues, PRs ou relatórios. Para possíveis vulnerabilidades, use o canal privado indicado pelos mantenedores; não publique detalhes de exploração ou segredos em issues.

A CI salva resultados de pytest, Semgrep, Bandit, Trivy e ZAP. Informe no PR links ou resultados reais; não marque um check como aprovado apenas porque seu YAML foi validado. Consulte [a documentação da esteira](docs/ci-cd.md) para limites dos scanners, publicação e recuperação.
