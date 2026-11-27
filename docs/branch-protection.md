# Regras de Proteção da Branch `main`

Para garantir a qualidade e a segurança das entregas em produção, a branch `main` opera com proteção ativa e exige que todos os Pull Requests passem pelos checks bloqueantes abaixo antes do merge.

## Checks Bloqueantes Obrigatórios

Configurados em **Settings > Branches > Branch protection rules (`main`)**:

| Check obrigatório | Job / Origem | O que valida |
| :--- | :--- | :--- |
| `Testa a Infraestrutura` | `.github/workflows/ci.yml` (`build-infra`) | Lint Python (`ruff`), SAST (`bandit`), lint Next.js, testes unitários/integração e autorização por perfil (`pytest` com cobertura ≥ 70%), DAST autenticado no backend e no frontend (`OWASP ZAP`) e scan de vulnerabilidades nas imagens Docker (`Trivy`). |

## Regras Adicionais de Merge

- **Require a pull request before merging:** bloqueia pushes diretos na `main`.
- **Require approvals:** exige revisão por pares (*Peer Review*) antes do merge.
- **Require status checks to pass before merging:** impede o merge caso qualquer validação de qualidade, autorização ou segurança falhe.