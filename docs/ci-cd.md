# CI, segurança e publicação

## Validação

`ci.yml` coordena o workflow reutilizável `quality.yml`. Backend (Ruff e pytest com PostgreSQL descartável), frontend (TypeScript e build) e SAST executam em paralelo. Só depois são construídas as imagens, com cache separado por componente, e executados os scans de container.

Semgrep usa CLI com `--error --strict`, conjuntos OWASP Top 10/security-audit e sem token de serviço. Bandit mantém a política anterior de severidade e confiança médias ou altas. Os dois scanners podem bloquear a execução. Os relatórios são preservados mesmo em falha, quando gerados.

Trivy bloqueia vulnerabilidades HIGH/CRITICAL com correção disponível. `ignore-unfixed` é uma política explícita: aprovação não significa ausência de todas as vulnerabilidades. A base de CVEs e os conjuntos remotos de regras evoluem; o mesmo commit pode produzir achados diferentes em outro dia.

O ZAP Baseline existente foi preservado como diagnóstico, sem abrir issues nem bloquear por alertas. A API precisa responder em `/health` antes do scan. Isso não é um pentest autenticado. Logs e relatórios ficam disponíveis por sete dias.

O frontend também executa `npm audit --audit-level=high` para verificar dependências de build que podem não aparecer na imagem final. O check final **CI gate** falha se qualquer job obrigatório falhar, for cancelado ou não executar. Configure-o como obrigatório no ruleset da branch; YAML sozinho não impede merge. Não utilize `pull_request_target` para executar código de contribuidores.

## Publicação

No fluxo institucional, pushes na `main` e em tags `vX.Y.Z` passam pela qualidade antes da publicação. PRs nunca fazem login nem enviam imagens ao GHCR. A compatibilidade com os nomes `carteira-backend` e `carteira-frontend` e com a tag `latest` usada pelo Compose de produção é preservada.

`publish-images.yml` constrói backend/frontend em AMD64 e ARM64. Cada imagem é escaneada e salva como artefato por um dia. Somente quando as quatro combinações passam, um job separado recebe `packages: write`, carrega esses mesmos artefatos e publica os manifests. Não há rebuild depois do scan, nem execução de código-fonte no job com permissão de publicação.

Imagens recebem labels de origem, commit e versão. A publicação verifica arquitetura e commit antes do envio e confirma as duas arquiteturas no manifest final. A tag versionada é publicada para cada componente; releases estáveis também recebem o alias sem o prefixo `v`. A atualização de `latest` é controlada pelo chamador. Os relatórios de scan e manifests ficam disponíveis como artefatos.

O GHCR não oferece transação entre os dois pacotes: uma falha de rede pode deixar apenas um componente publicado. Não faça deploy antes do sucesso do job completo. Prefira fixar digests em produção e mantenha a versão anterior para rollback.

## Manutenção e recuperação

Actions diretas são fixadas por SHA de commit, verificadas contra releases oficiais. Dependabot já monitora `github-actions`; revise também atualizações das ferramentas em `.github/requirements-security.txt`. Imagens base, dependências transitivas das ferramentas e regras remotas ainda precisam de manutenção; SHA das Actions não torna toda a cadeia imutável.

Instalações e testes rodam com leitura do repositório, checkout sem credenciais persistentes e timeouts. Publicação usa uma fila sem cancelar uma execução em andamento.

Se a publicação falhar, use **Re-run failed jobs** enquanto os artefatos estiverem disponíveis. Depois da expiração, reexecute a validação e a construção para gerar novos artefatos. A etapa de qualidade também pode ser iniciada manualmente na aba Actions. Habilite Actions no fork e confira a visibilidade dos pacotes antes de compartilhar links de entrega.
