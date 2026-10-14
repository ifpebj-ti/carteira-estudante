# Releases institucionais

Esta automação complementa os workflows reutilizáveis de qualidade e publicação do PR #183. A versão é conjunta para backend e frontend, registrada em `version.txt` e `.release-please-manifest.json`; as versões internas de `package.json` e `pyproject.toml` não são alteradas pela estratégia `simple`.

## Adoção e compatibilidade

O ponto de partida é a release institucional `v0.2.0`, não a release de demonstração do fork. `bootstrap-sha` aponta para o commit dessa tag (`3a856eadd814e27ba6c339e0081e972d5547eb2c`), delimitando o histórico do primeiro changelog. Revise esse changelog antes de aprovar a primeira release. Se outra release institucional for publicada antes da integração, atualize o manifesto, `version.txt` e o ponto de bootstrap antes do merge.

**Mudança de comportamento:** um merge comum na `main` deixa de publicar imagens e de atualizar `latest`. Ele valida o código e alimenta um PR de release. A publicação acontece depois que um mantenedor aprova e mescla esse PR. Pushes manuais de tags também deixam de iniciar o publicador antigo. Os nomes dos pacotes permanecem os mesmos, mas consumidores de `latest` passam a receber apenas releases estáveis. Este workflow não faz deploy automaticamente.

## Exemplo de ponta a ponta

1. Um PR traz `feat: permitir consulta da validade da carteira` como título. Ao usar squash merge, preserve esse título no commit resultante.
2. O push na `main` executa testes, build, Semgrep, Bandit e Trivy; ZAP permanece diagnóstico. Uma falha obrigatória impede a etapa de release.
3. Release Please abre ou atualiza um PR com versão e `CHANGELOG.md`. Ele não mescla esse PR automaticamente.
4. Após revisão e merge do PR de release, a qualidade roda novamente. Release Please cria a tag e a release; o workflow verifica que a tag aponta para o commit validado.
5. O publicador existente constrói e escaneia backend/frontend em AMD64 e ARM64 antes de enviar as imagens ao GHCR.

Exemplos independentes de incrementos, partindo de `0.2.0` e considerando apenas o tipo indicado:

| Commit | Versão proposta |
| --- | --- |
| `fix: corrigir validação de matrícula` | `0.2.1` |
| `feat: permitir consulta da validade da carteira` | `0.3.0` |
| `feat!: remover contrato antigo de autenticação` | `1.0.0` |

O incremento real considera todos os commits desde a última release. Uma alteração incompatível deve explicar a migração no corpo do commit com `BREAKING CHANGE:`. Commits somente `chore` ou `docs` normalmente não geram uma release por si só.

Para uma release hipotética `v0.3.0`, os pacotes institucionais seriam:

```text
ghcr.io/ifpebj-ti/carteira-backend:v0.3.0
ghcr.io/ifpebj-ti/carteira-frontend:v0.3.0
```

Cada pacote recebe também o alias `0.3.0` e, na publicação normal de uma release estável, `latest`. Ambos os manifests contêm `linux/amd64` e `linux/arm64`. O namespace é calculado pelo proprietário do repositório: executar em um fork não publica na organização.

## Configuração pelos mantenedores

- Permitir que GitHub Actions crie PRs em Settings → Actions → General, respeitando a política da organização. Não é necessário conceder `write-all`: somente o job de release recebe `contents: write` e `pull-requests: write`; somente a publicação recebe `packages: write`.
- Garantir que o repositório tenha acesso de escrita aos pacotes GHCR existentes e definir a visibilidade desejada. O workflow não muda essas configurações.
- Manter os checks de qualidade obrigatórios. Como PRs criados com `GITHUB_TOKEN` não disparam automaticamente novos workflows, um mantenedor pode fechar e reabrir o PR de release para disparar sua CI. Isso não significa ignorar aprovação de workflows ou checks obrigatórios. Para remover essa intervenção, a organização pode adotar uma GitHub App com permissões mínimas; essa integração não está incluída aqui.
- Proteger tags de release e revisar o primeiro changelog. Nenhuma proteção ou permissão administrativa é criada automaticamente por este PR.

## Recuperação e rollback

Primeiro use **Re-run failed jobs**. Se os artefatos expirarem, execute **Release and publish** manualmente na `main`, informando uma tag já publicada, por exemplo `v0.3.0`. O fluxo rejeita tags inválidas, releases em rascunho e commits fora do histórico da `main`; ele revalida o código da tag e reconstrói/escaneia as imagens.

A recuperação manual não atualiza `latest`. Uma reconstrução pode mudar o digest da tag versionada, pois imagens base e a base de vulnerabilidades evoluem. Para rollback exato, mantenha os digests implantados anteriormente e utilize-os no deployment.

Uma release no GitHub não garante que suas imagens tenham sido publicadas: confirme o sucesso de **Publish release images** e os dois manifests. GHCR não oferece transação entre os dois pacotes; em falha parcial, mantenha o deployment anterior e repita a publicação.

## Referências

- [Configuração de manifestos e bootstrap do Release Please](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md)
- [Release Please Action e limitações de eventos com GITHUB_TOKEN](https://github.com/googleapis/release-please-action)
