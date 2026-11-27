# Procedimento de Rollback em Produção

Este documento descreve como reverter rapidamente a aplicação (`carteira-backend` e `carteira-frontend`) para uma versão anterior em caso de falha pós-deploy.

## 1. Rollback Automático (via CI/CD)

Durante o job `deploy-prod` (`.github/workflows/ci.yml`), a pipeline:
1. Lê a última versão estável registrada em `~/carteira-estudante/.last_deployed_tag`.
2. Baixa e sobe as novas imagens usando a tag imutável (`IMAGE_TAG`).
3. Executa o healthcheck em `http://localhost:8000/health` e `http://localhost:3000` (até 15 tentativas com intervalo de 4s).
4. Caso o healthcheck falhe, o script reverte automaticamente para `PREVIOUS_TAG` e encerra o job com erro (`exit 1`).

## 2. Rollback Manual (via SSH na VM)

1. Conecte-se à VM via SSH e acesse o diretório do projeto:
   ```bash
   cd ~/carteira-estudante
   ```

2. Verifique a tag estável anterior registrada (ou consulte as tags disponíveis no GHCR):
   ```bash
   cat .last_deployed_tag
   ```

3. Suba novamente os contêineres apontando para a tag desejada (exemplo: `0.3.0` ou `sha-abc1234`):
   ```bash
   export IMAGE_TAG="<tag-anterior>"
   sudo IMAGE_TAG="${IMAGE_TAG}" docker compose -f docker-compose.prod.yml pull
   sudo IMAGE_TAG="${IMAGE_TAG}" docker compose -f docker-compose.prod.yml up -d
   ```

4. Valide a saúde dos serviços:
   ```bash
   curl -fsS http://localhost:8000/health
   curl -I http://localhost:3000
   ```

5. Atualize o arquivo de referência da versão ativa:
   ```bash
   echo "${IMAGE_TAG}" > .last_deployed_tag
   ```

## 3. Evidência de Teste em Homologação

- **Data do teste:** _(preencher após executar o teste)_
- **Tag inicial -> Tag de rollback:** _(ex.: `sha-xxxxxxx` -> `0.3.0`)_
- **Resultado:** Serviços restaurados com `GET /health` retornando `200 OK` (`"status": "ok"`) e frontend acessível na porta `3000`.