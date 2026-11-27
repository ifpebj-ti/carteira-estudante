**Contexto:**
O CI do frontend executa apenas lint e build, sem testes automatizados, o que permite que regressões em login, sessão, carteira e upload passem despercebidas.

**Critérios de Aceite:**

* [ ] Configurar framework de testes automatizados no frontend.
* [ ] Cobrir cenários principais: login, gerenciamento de sessão, exibição da carteira, upload de foto e tratamento de erros.
* [ ] Integrar a execução dos testes e relatório de cobertura no workflow de CI para todos os PRs.

**DoD:** A suíte automatizada do frontend executa em todos os PRs no GitHub Actions, validando automaticamente os fluxos de login, sessão, carteira, upload e erros, com relatório de cobertura publicado e bloqueando merges em caso de falha.