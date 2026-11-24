# eConference — notas rápidas para agentes

Leia o `README.md` (fonte de verdade do domínio, regras e arquitetura) e
`docs/casos-de-uso.md` antes de codificar. No front, leia também
`apps/frontend/AGENTS.md`: o Next 16 tem documentação própria em
`apps/frontend/node_modules/next/dist/docs/`.

## Forma de trabalho

- Desenvolvimento **um caso de uso por vez**, com revisão do usuário entre eles.
- Cada UC: schema Zod em `packages/shared` → rota na API → tela → testes.
- Branch por parte (`fase-N/...` ou `ucNN/...`), PR para `main`. Commits em
  português, no imperativo.

## Comandos (na raiz)

```bash
pnpm install
pnpm dev                     # web :3000 + API :3333
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm --filter @econference/backend test
```

## Armadilhas

- Não crie `apps/backend/src/app.ts` nem `apps/backend/src/index.ts` (a Vercel trata
  como entrada). A entrada é `src/server.ts`; a app é montada em `build-app.ts`.
- API e shared: ESM com imports relativos terminando em `.js`.
- `packages/shared` é consumido pelo `dist/`: depois de mudar, `pnpm build`
  (o Turborepo faz isso antes de dev/test/typecheck).
- TypeScript 6 (não 7: typescript-eslint ainda não suporta). No TS 6 o padrão
  de `types` é `[]`, por isso o `tsconfig.base.json` declara `"types": ["node"]`.
- Erros da API: `{ statusCode, error, message }`, mensagem em português.
- Rotas protegidas: `onRequest: [app.authenticate]` e `usuarioDaRequisicao(request)`.
- Toda rota nova: teste de sucesso, 401 sem token e (a partir da Fase 3) 403.
- Recebimentos: só `INSERT`; correção é estorno. Saldo/status são calculados.
- O recebido de um item nunca passa do solicitado (RN11).
