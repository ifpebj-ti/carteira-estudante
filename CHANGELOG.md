# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [0.2.0] - 2026-09-19

### Adicionado
- Estrutura inicial do monorepo separando `frontend` (Next.js) e `backend` (FastAPI).
- Documentação da base do projeto na Wiki (Visão, Arquitetura, Modelagem, Segurança, Execução).
- Containerização dos serviços utilizando Docker e Docker Compose.
- Pipeline de CI/CD via GitHub Actions (Lint, Testes e Build Multi-arquitetura).
- Publicação automatizada da imagem Docker no GitHub Container Registry (GHCR).
- Configuração do Dependabot para análise contínua de vulnerabilidades.

### Segurança
- Substituição da biblioteca abandonada `python-jose` por `PyJWT` para mitigação de vulnerabilidade (High) na dependência transitiva `ecdsa`.
- Implementação da action do OWASP ZAP (DAST) na esteira de CI/CD para detecção dinâmica de vulnerabilidades no contêiner.
- Implementação do Bandit (SAST) na esteira de CI/CD para análise estática de segurança no código-fonte Python.