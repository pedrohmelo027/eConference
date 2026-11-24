# eConference

Sistema de **conferência de recebimento** da **Rotex Máquinas**. Ele compara o
que a engenharia solicitou para compras com o que de fato chegou dos
fornecedores para a produção, item por item, com quantidades, saldos e
percentuais.

> **Para agentes de IA:** este README é a fonte de verdade sobre o domínio, as
> regras e a arquitetura. Leia-o inteiro antes de codificar. Os casos de uso
> detalhados estão em [`docs/casos-de-uso.md`](docs/casos-de-uso.md). As
> convenções de código estão em [Convenções](#convenções) e as notas rápidas em
> `CLAUDE.md`.

---

## Sumário

1. [O problema](#o-problema)
2. [A solução](#a-solução)
3. [Usuários e papéis](#usuários-e-papéis)
4. [Glossário](#glossário)
5. [Casos de uso](#casos-de-uso)
6. [Regras de negócio](#regras-de-negócio)
7. [A planilha modelo](#a-planilha-modelo)
8. [Arquitetura](#arquitetura)
9. [Stack](#stack)
10. [Banco de dados](#banco-de-dados)
11. [API](#api)
12. [Estrutura do repositório](#estrutura-do-repositório)
13. [Rodando localmente](#rodando-localmente)
14. [Deploy](#deploy)
15. [Convenções](#convenções)
16. [Roteiro de desenvolvimento](#roteiro-de-desenvolvimento)
17. [Fora do escopo (por enquanto)](#fora-do-escopo-por-enquanto)

---

## O problema

A Rotex sabe exatamente **o que a engenharia pediu** para compras, mas não tem
controle sobre **o que os fornecedores entregaram** para a produção.

- Nem tudo o que é solicitado chega, ou chega em quantidade diferente.
- Muitas vezes não se sabe a qual projeto uma peça pertence. A mesma peça
  (mesmo código) aparece em várias solicitações de projetos diferentes, e a
  referência que se tem é o desenho.
- O volume é grande: uma carga pode ter **2 a 3 mil peças**.
- Hoje o controle é feito em planilhas, papel e de cabeça. Isso gera atraso,
  produção parada e dúvida sobre o que foi ou não entregue.

## A solução

Um sistema web com este fluxo:

1. a **Engenharia** cadastra o **projeto**;
2. baixa a **planilha modelo** do eConference, preenche e envia para
   **compras** por e-mail (fora do sistema);
3. **importa** a mesma planilha no projeto. A solicitação entra como
   **rascunho**;
4. confere, corrige e **libera** a solicitação para PCP e Produção;
5. a **Produção** marca, item por item, o que chegou e quanto chegou, pelo
   celular ou tablet no chão de fábrica;
6. o **PCP** acompanha o andamento (solicitado × recebido) e extrai relatórios
   do que chegou e do que falta.

O recebido de um item **nunca passa do solicitado**. O que chegar a mais vai
para o almoxarifado e não é controlado pelo sistema nesta versão.

O ponto de partida visual é o protótipo HTML "Conferência de Recebimento —
Rotex Máquinas" (cartões de item, filtros por processo, progresso ponderado,
saldo faltante). Ele guardava tudo no navegador. O eConference leva isso para
um sistema com banco de dados, vários usuários e histórico. Do protótipo
**saem** as funções "Limpar tudo" e "Compartilhar pelo WhatsApp", e **entra** a
função "Extrair relatório".

## Usuários e papéis

Cada usuário tem **um** papel. Não existe cadastro público: quem cria usuários
é o administrador, sempre com uma **senha provisória**. No primeiro acesso o
sistema obriga a definir uma senha pessoal (pelo menos 8 caracteres, com letras e
números) antes de liberar qualquer tela ou rota da API. Se o admin redefinir a
senha de alguém, a troca volta a ser obrigatória.

| Papel        | Quem é                              | Pode                                                                                     | Não pode                                                                                      |
| ------------ | ----------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `admin`      | TI / responsável pelo sistema       | **tudo** o que os outros papéis fazem, mais usuários, papéis, processos e pesos          | —                                                                                             |
| `engenharia` | quem monta a planilha para compras  | gerenciar projetos; importar, criar, editar, cancelar e **liberar** solicitações e itens | lançar recebimentos; aumentar a quantidade de um item já liberado                             |
| `producao`   | quem recebe as peças                | marcar itens como entregues, com a quantidade recebida; estornar lançamentos             | alterar o que foi solicitado; ver rascunhos; registrar NF, fornecedor ou peça sem solicitação |
| `pcp`        | planejamento e controle da produção | **só visualizar**: consultas, painel, relatórios e histórico                             | qualquer alteração; ver rascunhos                                                             |

Todos os papéis podem consultar solicitações, painel, relatórios e histórico.
PCP e Produção só enxergam solicitações **liberadas**.

_Compras_ não usa o sistema: recebe da engenharia a planilha modelo preenchida.

## Glossário

| Termo                        | Significado                                                                                                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Projeto**                  | A máquina ou obra. Ex.: Esteira 24 ASTA, Esteira 36 ASTA, Esteira DUPLA, Pés inclinados. Ativo ou encerrado.                                                                                    |
| **Solicitação**              | Um pedido da engenharia para compras, de **um** projeto. Corresponde a **uma planilha modelo**. Ex.: "Módulos motor - esteiras 24 ASTA", 17/11/2026 09:39. Tem título, data, hora?, observação. |
| **Rascunho**                 | Solicitação importada ou cadastrada e ainda não liberada. Só Engenharia e Admin veem; pode ser corrigida livremente.                                                                            |
| **Liberação**                | Ato da engenharia que torna a solicitação visível para PCP e Produção e permite receber peças. Não tem volta.                                                                                   |
| **Item** (de solicitação)    | Uma linha da solicitação: processo, código, material, medida e quantidade solicitada.                                                                                                           |
| **Processo**                 | Como a peça é fabricada ou que tipo de material ela é: Corte Laser, Corte e Dobra, Oxicorte, Roletes, Matéria-Prima, Comerciais. Cada um tem um **peso**.                                       |
| **Peso**                     | Importância do processo no cálculo do andamento ponderado.                                                                                                                                      |
| **Código**                   | Identificação da peça (ex.: `ET024-MA-001-008`). Em Comerciais e Matéria-Prima costuma ser uma descrição (ex.: `PARAFUSO SEXTAVADO DIN 933 - M10 X 20`). **Não é único** entre solicitações.    |
| **Medida**                   | Antiga coluna "Espessura". Texto livre com unidades mistas: `12,7 mm`, `3/4"`, `M10 x 20`, `6 m`.                                                                                               |
| **Recebimento** (lançamento) | Registro de que chegou uma quantidade de um item, com data/hora e quem lançou. Um item pode ter vários.                                                                                         |
| **Estorno**                  | Lançamento que anula um recebimento lançado errado. Nada é apagado.                                                                                                                             |
| **Saldo**                    | Solicitado − recebido. O que ainda falta chegar. Nunca negativo.                                                                                                                                |
| **Andamento ponderado**      | % recebido considerando o peso de cada processo.                                                                                                                                                |

## Casos de uso

O documento completo, com fluxos principais e alternativos, está em
[`docs/casos-de-uso.md`](docs/casos-de-uso.md). Resumo:

| ID   | Caso de uso                              | Admin | Eng. | Prod. | PCP |
| ---- | ---------------------------------------- | :---: | :--: | :---: | :-: |
| UC01 | Entrar no sistema                        |   ✔   |  ✔   |   ✔   |  ✔  |
| UC02 | Gerenciar usuários e papéis              |   ✔   |      |       |     |
| UC03 | Gerenciar processos e pesos              |   ✔   |      |       |     |
| UC04 | Gerenciar projetos                       |   ✔   |  ✔   |       |     |
| UC05 | Importar planilha de solicitação         |   ✔   |  ✔   |       |     |
| UC06 | Cadastrar solicitação / item manualmente |   ✔   |  ✔   |       |     |
| UC07 | Editar ou cancelar solicitação / item    |   ✔   |  ✔   |       |     |
| UC08 | Liberar solicitação para PCP e Produção  |   ✔   |  ✔   |       |     |
| UC09 | Consultar solicitações e itens           |   ✔   |  ✔   |   ✔   |  ✔  |
| UC10 | Buscar peça por código                   |   ✔   |  ✔   |   ✔   |  ✔  |
| UC11 | Registrar recebimento                    |   ✔   |      |   ✔   |     |
| UC12 | Corrigir (estornar) um recebimento       |   ✔   |      |   ✔   |     |
| UC13 | Acompanhar andamento (painel)            |   ✔   |  ✔   |   ✔   |  ✔  |
| UC14 | Extrair relatório                        |   ✔   |  ✔   |   ✔   |  ✔  |
| UC15 | Consultar histórico de alterações        |   ✔   |  ✔   |   ✔   |  ✔  |

Os casos centrais:

**UC05 — Importar planilha.** A engenharia escolhe o projeto e envia a planilha
modelo preenchida. O sistema lê o cabeçalho e os itens e mostra uma **prévia**
(itens, peças, por processo, avisos e erros). Confirmada, grava tudo numa única
transação, como **rascunho**.

- **Avisos** (não bloqueiam): mesmo código com medida diferente em outra
  solicitação (RN13); solicitação que parece já importada (mesmo projeto,
  título e data); projeto escrito na planilha diferente do escolhido.
- **Erros** (bloqueiam): arquivo fora do modelo; título ou data vazios; linha
  sem processo, código ou quantidade; quantidade não inteira ou ≤ 0; processo
  inexistente ou desativado; código repetido na planilha; projeto encerrado.

**UC08 — Liberar.** A engenharia confere o rascunho e libera. A solicitação
passa a **aberta**, aparece para PCP e Produção e pode receber peças. A partir
daí a quantidade de um item só diminui (RN09).

**UC11 — Registrar recebimento** (todos os processos, inclusive Comerciais). A
Produção abre a solicitação, ou chega pela busca por código (UC10), e no item
marca "entregue" (lança o saldo) ou informa a quantidade recebida. Registra
**só isso**: sem NF, fornecedor ou observação. Quem recebe escolhe a linha, pelo
desenho. Cada chegada é **um novo lançamento** e o recebido é a soma:

- **parcial:** o item fica "parcial" e o saldo aparece em destaque;
- **acima do saldo:** **não é aceito**; lança-se só o saldo e a sobra vai para
  o almoxarifado;
- **vários itens de uma vez:** marca vários e confirma num envio só (tudo ou
  nada).

Peça que não está em nenhuma solicitação liberada **não é registrada**.
Lançamentos não são apagados: correção é estorno (UC12).

**UC14 — Extrair relatório.** Recorte por projeto, solicitação, processo,
status e período. Lista, por item: código, solicitação, processo, solicitado,
recebido, saldo, **% recebido** e status. Traz subtotais por processo e por
solicitação, e o % geral ponderado e simples. Exporta **XLSX** e **PDF**. Há uma
variação "somente o que não chegou".

## Regras de negócio

| ID   | Regra                                                                                                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RN01 | Cada item pertence a uma solicitação, e cada solicitação a um projeto. O mesmo código pode estar em várias solicitações e **cada linha é controlada separadamente**. Não há distribuição automática.         |
| RN02 | Toda peça registrada pertence a um item de uma solicitação **liberada**. Peça sem solicitação **não é registrada**.                                                                                          |
| RN03 | `recebido` do item = soma das entradas − soma dos estornos.                                                                                                                                                  |
| RN04 | Status do item: `pendente` (recebido = 0), `parcial` (< solicitado), `completo` (= solicitado) ou `cancelado`.                                                                                               |
| RN05 | Status da solicitação: `rascunho` (não liberada), `aberta` (liberada, algum item com saldo), `concluida` (todos os itens completos ou cancelados) ou `cancelada`.                                            |
| RN06 | % do item = recebido ÷ solicitado.                                                                                                                                                                           |
| RN07 | % ponderado = Σ(recebido × peso) ÷ Σ(solicitado × peso), ignorando itens cancelados.                                                                                                                         |
| RN08 | Lançamentos e alterações **nunca são apagados**; tudo vai para o histórico (quem, quando, o quê). Exceção: rascunho pode ser descartado (o descarte fica no histórico).                                      |
| RN09 | Depois da liberação, a quantidade solicitada **nunca aumenta**. Pode ser reduzida, mas não abaixo do já recebido. Para pedir mais, cadastra-se um **novo item**. Item liberado não é excluído, só cancelado. |
| RN10 | O mesmo código pode se repetir no mesmo projeto, desde que em outra solicitação ou com outra data de solicitação. Na mesma planilha, não.                                                                    |
| RN11 | O recebido de um item **nunca ultrapassa** o solicitado (saldo ≥ 0). Sobra vai para o almoxarifado, fora do sistema.                                                                                         |
| RN12 | Permissões: `admin` faz tudo; `engenharia` gerencia projetos e solicitações e libera; `producao` registra e estorna recebimentos; `pcp` só visualiza. PCP e Produção só veem solicitações liberadas.         |
| RN13 | Mesmo código com medida diferente entre solicitações é tratado como provável erro de planilha e gera aviso na importação.                                                                                    |

Pesos iniciais dos processos (configuráveis pelo admin):

| Processo      | Peso |
| ------------- | ---- |
| Corte Laser   | 5    |
| Corte e Dobra | 5    |
| Oxicorte      | 4    |
| Roletes       | 3    |
| Matéria-Prima | 3    |
| Comerciais    | 1    |

## A planilha modelo

Arquivo `.xlsx` fornecido pelo eConference (download na tela do projeto). A
engenharia preenche, envia para compras e importa (UC05). **Uma planilha = uma
solicitação de um projeto.** Substitui a planilha antiga, que misturava várias
solicitações na aba "Itens" agrupadas pela coluna "E-mail / Projeto".

**Aba `Solicitação`** — cabeçalho:

| Campo      | Obrigatório | Exemplo                                                   |
| ---------- | :---------: | --------------------------------------------------------- |
| Projeto    |      ✔      | `Esteira 24 ASTA` (conferido com o projeto da importação) |
| Título     |      ✔      | `Módulos motor - esteiras 24 ASTA`                        |
| Data       |      ✔      | `17/11/2026`                                              |
| Hora       |             | `09:39`                                                   |
| Observação |             | `anexo PÉS INCLINADOS.rar`                                |

Tabela de itens, logo abaixo do cabeçalho:

| Coluna             | Obrigatório | Exemplo                                                       |
| ------------------ | :---------: | ------------------------------------------------------------- |
| Processo           |      ✔      | `Corte Laser` (lista suspensa com os processos ativos)        |
| Código / Descrição |      ✔      | `ET024-MA-001-008` ou `PARAFUSO SEXTAVADO DIN 933 - M10 X 20` |
| Material           |             | `SAE 1020`, `Viga U 6" 1ª alma`                               |
| Medida             |             | `9,525 mm`                                                    |
| Quantidade         |      ✔      | `4` (inteiro > 0)                                             |

Posições fixas (contrato da importação): Projeto `C4`, Título `C5`, Data `C6`,
Hora `C7`, Observação `C8`; cabeçalho da tabela na linha 10 (`A` Nº, `B`
Processo, `C` Código / Descrição, `D` Material, `E` Medida, `F` Quantidade);
itens da linha 11 à 510 (até 500 itens). A coluna Nº e os totais (`F4` itens,
`F5` peças) são fórmulas e não são lidos.

Arquivos em [`docs/planilha-modelo/`](docs/planilha-modelo/): o modelo em
branco e um exemplo preenchido (útil para testar a importação). No sistema, o
modelo será gerado pela API (`GET /planilha-modelo`) com a lista de processos
ativos.

Outras abas: **`Resumo`** (peças por processo, com fórmulas, para compras),
**`Instruções`** e **`Listas`** (oculta, com os processos da lista suspensa). A importação lê só a aba `Solicitação`. A planilha **não tem**
colunas de fornecedor, pedido de compra, prazo ou unidade.

Referência da planilha antiga (amostra de 16 a 18/11/2026): 117 linhas, 17
solicitações e 2.386 peças. `ET024-MA-001-008` e `ET036-MA-001-008` apareciam
com medidas diferentes em solicitações diferentes, o que a engenharia confirmou
ser **erro na planilha** (por isso o aviso RN13).

## Arquitetura

```
┌───────────────────┐   HTTPS + JWT    ┌───────────────────┐   SQL (pooler)   ┌──────────────────────┐
│  apps/frontend    │ ───────────────▶ │  apps/backend     │ ───────────────▶ │  Supabase            │
│  Next.js          │ ◀─────────────── │  Fastify          │ ◀─────────────── │  Postgres + Auth     │
│  (Vercel)         │      JSON        │  (Vercel Function)│                  │                      │
└────────┬──────────┘                  └───────────────────┘                  └──────────┬───────────┘
         │                login / sessão (Supabase Auth)                                 │
         └────────────────────────────────────────────────────────────────────────────────┘
```

Princípios:

1. **A API é a única porta para os dados.** O front usa o Supabase **só para
   login** (obter e renovar a sessão). Toda leitura e escrita de dados passa
   pelo Fastify, com o access token em `Authorization: Bearer <token>`. Regras
   de negócio, permissões e auditoria ficam na API.
2. **RLS como segunda camada.** As tabelas têm Row Level Security ativado e o
   front não tem acesso direto. Se a chave pública vazar, nada é exposto.
3. **Contratos compartilhados.** Os schemas Zod de entrada e saída ficam em
   `packages/shared`. A API usa esses schemas para validar e documentar, e o
   front para tipar e validar respostas.
4. **Histórico imutável.** Recebimentos e estornos são lançamentos que só são
   inseridos, nunca atualizados ou apagados. Saldo e status são **calculados**
   (views), nunca gravados à mão.
5. **Transações para operações em lote.** Importação e recebimento de vários
   itens gravam tudo ou nada.
6. **Saldo garantido no banco.** Dois conferentes podem lançar o mesmo item ao
   mesmo tempo. O lançamento trava a linha do item (`SELECT … FOR UPDATE`) e
   confere o saldo dentro da transação, para que o recebido nunca passe do
   solicitado (RN11).
7. **Pensado para serverless.** A API roda como Vercel Function:
   - conexão ao Postgres pelo **pooler do Supabase** (modo transaction, porta
     6543, sem prepared statements);
   - nada de estado em memória entre requisições;
   - nada de navegador headless (PDF gerado com biblioteca leve).
8. **Produção usa celular.** As telas de conferência são pensadas primeiro para
   celular: botões grandes (≥ 44 px), busca por código no topo e poucos toques
   por item.

Validação do token na API (`apps/backend/src/plugins/auth.ts`): por padrão usa as
chaves públicas do projeto (JWKS em
`SUPABASE_URL/auth/v1/.well-known/jwks.json`). Se o projeto usar a chave
legada HS256, use `SUPABASE_JWT_SECRET`. O papel do usuário vem da tabela
`perfis`, não do token.

## Stack

| Camada          | Tecnologia                                       | Versão | Observação                                                                            |
| --------------- | ------------------------------------------------ | ------ | ------------------------------------------------------------------------------------- |
| Runtime         | Node.js                                          | 22     | `.nvmrc`                                                                              |
| Gerenciador     | pnpm workspaces                                  | 10     | `packageManager` no `package.json`                                                    |
| Monorepo        | Turborepo                                        | 2      | `turbo.json`                                                                          |
| Linguagem       | TypeScript                                       | 6.0    | 7.0 ainda não é suportado pelo typescript-eslint                                      |
| Front-end       | Next.js (App Router)                             | 16     | React 19, Turbopack. **Leia `apps/frontend/AGENTS.md`**                               |
| Estilo          | Tailwind CSS                                     | 4      | shadcn/ui                                                                             |
| Dados no front  | TanStack Query                                   | 5      |                                                                                       |
| Back-end        | Fastify                                          | 5      | `fastify-type-provider-zod`, `@fastify/cors`, `@fastify/sensible`, `@fastify/swagger` |
| Validação       | Zod                                              | 4      | em `packages/shared`                                                                  |
| Auth (token)    | jose                                             | 6      | verificação do JWT do Supabase                                                        |
| Banco           | Supabase (Postgres)                              | —      | migrations via Supabase CLI em `supabase/`                                            |
| Acesso ao banco | Drizzle ORM                                      | —      |                                                                                       |
| Planilhas       | ExcelJS                                          | —      | planilha modelo, importação e relatório XLSX                                          |
| Testes          | Vitest                                           | 5      | API com `app.inject`                                                                  |
| Lint / formato  | ESLint (10 na API/shared, 9 no web) + Prettier 3 | —      |                                                                                       |
| Hospedagem      | Vercel (web e API) + Supabase                    | —      |                                                                                       |

## Banco de dados

Postgres no Supabase. Projeto de desenvolvimento: **`econference-dev`**
(ref `avopmfkwbmvvlgjrkqyf`, região `sa-east-1`, São Paulo). O de produção será
criado no deploy.

```
supabase/
├── config.jsonc                         # Supabase CLI (banco local, seed)
├── migrations/
│   ├── 20261124180000_estrutura.sql     # tipos, tabelas, índices, processos iniciais
│   ├── 20261124180100_regras.sql        # gatilhos: regras de negócio e auditoria
│   ├── 20261124180200_views.sql         # vw_itens_saldo, vw_solicitacoes_resumo, vw_projetos_resumo
│   ├── 20261124180300_acesso.sql        # papel econference_api, privilégios, RLS
│   ├── 20261124190000_primeiro_acesso.sql # senha provisória e troca obrigatória (UC01)
│   └── 20261124200000_usuarios.sql      # senha provisória vai para o histórico (UC02)
├── scripts/criar-admin.sql              # cria o primeiro admin de um ambiente
├── seed.sql                             # dados de desenvolvimento (projetos + solicitação de exemplo)
└── tests/regras.sql                     # testes das regras no banco (transação desfeita)
```

### Modelo

```
perfis (autor de tudo)
processos ───────────────┐
projetos ── solicitacoes ── solicitacao_itens ── recebimento_lancamentos (entrada | estorno)
                 │
                 └── importacoes
auditoria (eventos de todas as tabelas)
```

| Tabela                    | Campos principais                                                                                                                                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `perfis`                  | `id` (= `auth.users.id`), `nome`, `email`, `papel` (`admin`/`engenharia`/`producao`/`pcp`), `ativo`                                                                                                                                                                                 |
| `processos`               | `id`, `nome` (único), `peso`, `ativo`                                                                                                                                                                                                                                               |
| `projetos`                | `id`, `nome` (único), `codigo?`, `encerrado_em?`                                                                                                                                                                                                                                    |
| `solicitacoes`            | `id`, `projeto_id`, `titulo`, `data`, `hora?`, `observacao?`, `liberada_em?`, `liberada_por?`, `cancelada_em?`, `motivo_cancelamento?`, `importacao_id?`, `criado_por`, `criado_em`                                                                                                 |
| `solicitacao_itens`       | `id`, `solicitacao_id`, `processo_id`, `codigo`, `codigo_normalizado` (maiúsculas, sem espaços extras), `material?`, `medida?`, `quantidade` (> 0), `data_solicitacao`, `cancelado_em?`, `motivo_cancelamento?`. Único (`solicitacao_id`, `codigo_normalizado`, `data_solicitacao`) |
| `recebimento_lancamentos` | `id`, `item_id`, `tipo` (`entrada`/`estorno`), `quantidade` (> 0), `estorna_id?` (único), `motivo?` (obrigatório no estorno), `lote_id` (agrupa um envio de vários itens), `lancado_por`, `lancado_em`. **Só insert**                                                               |
| `importacoes`             | `id`, `projeto_id`, `arquivo`, `linhas`, `avisos` (jsonb), `importado_por`, `importado_em`                                                                                                                                                                                          |
| `auditoria`               | `id`, `tabela`, `registro_id`, `acao`, `antes` (jsonb), `depois` (jsonb), `usuario_id`, `em`                                                                                                                                                                                        |

Views:

- **`vw_itens_saldo`**: por item, `solicitado`, `recebido` (RN03), `saldo`,
  `percentual`, `status` (RN04).
- **`vw_solicitacoes_resumo`**: por solicitação, totais, % simples, %
  ponderado (RN07) e status (RN05).
- **`vw_projetos_resumo`**: os mesmos totais por projeto.

Não serão registrados: fornecedor, pedido de compra, prazo, unidade, NF e
sobras.

O mapeamento das tabelas para a API (Drizzle) fica em
`apps/backend/src/db/schema.ts`. A fonte da verdade é o SQL das migrations: o
Drizzle não gera migrations.

### Regras garantidas no banco

Os gatilhos repetem as regras que a API valida, para que nenhum caminho as
contorne. Erros de regra usam `SQLSTATE P0001` com mensagem em português, e a
API responde **422** com essa mensagem.

| Regra                                                                                     | Onde                      |
| ----------------------------------------------------------------------------------------- | ------------------------- |
| Rascunho não recebe peças; liberação exige item e não volta atrás                         | solicitações, lançamentos |
| Solicitação/item liberado não é excluído (só cancelado); rascunho pode ser descartado     | solicitações, itens       |
| Depois de liberada, a quantidade não aumenta nem fica abaixo do recebido (RN09)           | itens                     |
| Recebido nunca passa do solicitado (RN11), com trava da linha do item contra concorrência | lançamentos               |
| Estorno: com motivo, mesma quantidade, uma vez só, nunca de outro estorno                 | lançamentos               |
| Lançamentos e auditoria não são alterados nem apagados (RN08)                             | lançamentos, auditoria    |
| Projeto encerrado não recebe solicitação                                                  | solicitações              |
| Todo insert/update/delete vai para `auditoria`, com o usuário da transação                | todas                     |

O usuário da auditoria vem de `app.usuario_id`, que a API define em cada
transação (`emNomeDe(db, usuarioId, fn)` em `apps/backend/src/plugins/db.ts`).

### Primeiro acesso (troca obrigatória de senha)

Não existe uma flag que o cliente possa mudar. Ao definir uma senha provisória,
`public.registrar_senha_provisoria(usuario)` guarda o hash dela em
`senhas_provisorias` (tabela que nem a API lê). `public.troca_senha_pendente(usuario)`
compara com a senha atual do Supabase Auth: enquanto forem iguais, a troca está
pendente. O usuário troca a senha pelo Supabase Auth no front, o hash muda e a
pendência some sozinha.

- `GET /me` devolve `trocaSenhaPendente`; o front leva para `/primeiro-acesso`.
- `app.exigirPapel(...)` responde **403** "Defina uma nova senha antes de
  continuar." em qualquer outra rota enquanto a troca estiver pendente.
- Primeiro admin de cada ambiente: `supabase/scripts/criar-admin.sql` no SQL
  Editor. Em `econference-dev`: `engenharia1@rotexmaquinas.com.br`. Os demais
  usuários são criados pelo admin na tela **Usuários** (UC02), que usa a Admin API
  do Supabase Auth com `SUPABASE_SECRET_KEY` e chama `registrar_senha_provisoria`.
- Desativar um usuário: `perfis.ativo = false` e bloqueio no Supabase Auth
  (`ban_duration`); reativar desfaz os dois.

**E-mail de redefinição ("Esqueci minha senha"):** o SMTP padrão do Supabase só
entrega para e-mails da equipe do projeto Supabase e tem limite baixo de envios.
Antes do piloto, configure um SMTP próprio em Authentication → Emails e adicione
as URLs do front (ex.: `https://<front>/redefinir-senha`) em Authentication → URL
Configuration.

### Acesso

- **O front não acessa o banco.** `anon` e `authenticated` não têm nenhum
  privilégio nas tabelas e views; o RLS só tem políticas para a API.
- **A API conecta com o papel `econference_api`**: sem DDL, sem acesso ao schema
  `auth`, sem `UPDATE`/`DELETE` em lançamentos. A migration cria o papel sem
  login; a senha é definida **por ambiente**, no SQL Editor, e nunca vai para o
  Git:

  ```sql
  alter role econference_api with login password '<senha forte>' connection limit 30;
  ```

- `DATABASE_URL` (pooler, modo transaction):
  `postgresql://econference_api.<ref>:<senha>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`

### Migrations, seed e testes

- Nova mudança = novo arquivo em `supabase/migrations/` (nunca edite um já
  aplicado). Aplicar: `pnpm dlx supabase link --project-ref <ref>` e
  `pnpm dlx supabase db push`, ou pelo SQL Editor / MCP do Supabase mantendo a
  versão igual ao nome do arquivo em `supabase_migrations.schema_migrations`.
- `supabase/seed.sql`: só desenvolvimento. Idempotente.
- `supabase/tests/regras.sql`: rode no SQL Editor; o relatório sai como um erro
  proposital `RELATORIO` e nada é gravado. Nenhuma linha pode começar com
  `FALHOU`.
- `apps/backend/test/banco.test.ts`: integração da API com o banco real (pooler,
  privilégios, views, erro P0001). Roda quando `DATABASE_URL` está no
  `apps/backend/.env`; no CI, sem banco, é pulado.

## API

Rotas previstas (nomes podem mudar; os contratos ficam em `packages/shared`).
O `admin` tem acesso a todas.

| Rota                                                                                                           | Papéis (além do admin) | Caso de uso |
| -------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------- |
| `GET /health`, `GET /openapi.json`                                                                             | sem login              | —           |
| `GET /me` (perfil, papel e `trocaSenhaPendente`)                                                               | todos                  | UC01        |
| `GET/POST /usuarios`, `PATCH /usuarios/:id`, `POST /usuarios/:id/redefinir-senha`                              | —                      | UC02        |
| `/processos` (escrita)                                                                                         | —                      | UC03        |
| `/projetos` (escrita)                                                                                          | engenharia             | UC04        |
| `GET /planilha-modelo`, `POST /importacoes/previa`, `POST /importacoes`                                        | engenharia             | UC05        |
| `POST /solicitacoes`, `PATCH /solicitacoes/:id`, `POST /solicitacoes/:id/cancelar`, `POST /itens/:id/cancelar` | engenharia             | UC06, UC07  |
| `POST /solicitacoes/:id/liberar`                                                                               | engenharia             | UC08        |
| `GET /solicitacoes`, `GET /solicitacoes/:id`, `GET /projetos`, `GET /processos`                                | todos                  | UC09        |
| `GET /itens?codigo=`                                                                                           | todos                  | UC10        |
| `POST /recebimentos` (um ou vários itens)                                                                      | producao               | UC11        |
| `POST /lancamentos/:id/estornar`                                                                               | producao               | UC12        |
| `GET /painel`                                                                                                  | todos                  | UC13        |
| `GET /relatorios` (`?formato=xlsx\|pdf`)                                                                       | todos                  | UC14        |
| `GET /historico/:tabela/:id`                                                                                   | todos                  | UC15        |

Erros seguem `{ statusCode, error, message }`, com mensagens em português.

## Estrutura do repositório

```
econference/
├── apps/
│   ├── backend/              # API — Fastify (@econference/backend)
│   │   ├── src/
│   │   │   ├── server.ts     # entrada (detectada pela Vercel) — chama listen()
│   │   │   ├── build-app.ts  # monta a app (plugins + rotas), usado também nos testes
│   │   │   ├── env.ts        # variáveis de ambiente validadas com Zod
│   │   │   ├── plugins/      # auth, db, permissões
│   │   │   └── routes/       # um arquivo por recurso
│   │   ├── test/             # Vitest + app.inject
│   │   └── vercel.json
│   └── frontend/             # telas — Next.js (@econference/frontend)
│       ├── src/app/          # rotas (App Router)
│       ├── src/components/
│       ├── src/lib/          # cliente da API, env
│       ├── AGENTS.md         # regras do Next 16 para agentes
│       └── vercel.json
├── packages/
│   ├── config/               # tsconfig e ESLint compartilhados
│   └── shared/               # schemas Zod, papéis, status, processos, cálculos
├── supabase/                 # migrations SQL e seed
├── docs/                     # casos de uso e definições
├── .github/workflows/ci.yml  # format, lint, typecheck, test, build
├── CLAUDE.md                 # notas rápidas para agentes
└── turbo.json
```

## Rodando localmente

Pré-requisitos: Node.js 22 e pnpm 10 (`corepack enable`).

```bash
pnpm install

cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local

pnpm dev
```

- Front: http://localhost:3000 (mostra se a API e o banco estão conectados)
- API: http://localhost:3333/health
- OpenAPI: http://localhost:3333/openapi.json

| Comando (na raiz)                   | O que faz                         |
| ----------------------------------- | --------------------------------- |
| `pnpm dev`                          | sobe web e API em desenvolvimento |
| `pnpm build`                        | build de todos os pacotes         |
| `pnpm lint`                         | ESLint                            |
| `pnpm typecheck`                    | checagem de tipos                 |
| `pnpm test`                         | testes (Vitest)                   |
| `pnpm format` / `pnpm format:check` | Prettier                          |

Para um pacote só: `pnpm --filter @econference/backend test`.

### Variáveis de ambiente

| App      | Variável                                                           | Descrição                                                                         |
| -------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| backend  | `PORT`, `HOST`                                                     | só local (padrão 3333 / 0.0.0.0)                                                  |
| backend  | `CORS_ORIGIN`                                                      | origens do front, separadas por vírgula                                           |
| backend  | `SUPABASE_URL`                                                     | `https://<ref>.supabase.co`                                                       |
| backend  | `SUPABASE_JWT_SECRET`                                              | opcional, só para chave legada HS256 (deixe vazia: o projeto usa ES256/JWKS)      |
| backend  | `SUPABASE_SECRET_KEY`                                              | chave secreta `sb_secret_...` (Admin API do Auth, UC02). Nunca vai para o front   |
| backend  | `DATABASE_URL`                                                     | pooler do Supabase com `econference_api` (veja [Banco de dados](#banco-de-dados)) |
| frontend | `NEXT_PUBLIC_API_URL`                                              | URL da API                                                                        |
| frontend | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | login                                                                             |

Nunca versionar `.env`. Só os `.env.example` vão para o Git.

## Deploy

Dois projetos na Vercel apontando para este repositório:

| Projeto                | Root Directory  | Framework | Variáveis                                                            |
| ---------------------- | --------------- | --------- | -------------------------------------------------------------------- |
| `econference-frontend` | `apps/frontend` | Next.js   | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_*`                      |
| `econference-backend`  | `apps/backend`  | Fastify   | `CORS_ORIGIN`, `SUPABASE_URL`, `DATABASE_URL`, `SUPABASE_SECRET_KEY` |

O `vercel.json` de cada app roda o build pelo Turborepo a partir da raiz, para
o `packages/shared` ser compilado antes. Banco e Auth ficam no Supabase, com um
projeto de desenvolvimento e outro de produção. As migrations são aplicadas
pela Supabase CLI.

## Convenções

**Idioma**

- Domínio em **português**: tabelas, colunas, rotas, schemas e nomes de
  negócio (`solicitacao`, `recebimento`, `saldo`).
- Termos técnicos genéricos em inglês quando forem o padrão (`buildApp`,
  `request`, `schema`).
- Textos de interface, erros e documentação em português.

**Código**

- TypeScript estrito; ESM (`"type": "module"`). Na API e no shared, imports
  relativos com extensão `.js`.
- Formatação: Prettier (sem ponto e vírgula, aspas simples, 100 colunas).
  Rode `pnpm format`.
- Contratos novos de API: crie o schema Zod em `packages/shared`, exporte em
  `src/index.ts`, rode `pnpm build` e use na API (`schema.body` /
  `schema.response`) e no web.
- API: uma rota por recurso em `src/routes/`, registrada em `build-app.ts`.
  Proteja com `onRequest: [app.authenticate]` e com a checagem de papel.
- **Não crie `apps/backend/src/app.ts` nem `apps/backend/src/index.ts`**: a Vercel
  também os trata como entrada.
- Regras de cálculo (status, %) ficam em funções puras em `packages/shared`,
  com testes, e são espelhadas nas views do banco.
- Banco: toda mudança é uma migration nova em `supabase/migrations/`. Nunca
  edite uma migration já aplicada. RLS ativado em todas as tabelas.
- Lançamentos de recebimento: só `INSERT`. Correção = estorno.

**Qualidade**

- Antes de terminar qualquer mudança: `pnpm format:check && pnpm lint &&
pnpm typecheck && pnpm test && pnpm build`. O CI roda o mesmo.
- Toda rota nova tem teste cobrindo sucesso, sem token (401) e papel sem
  permissão (403).

**Git**

- Uma branch por parte: `fase-N/descricao` ou `ucNN/descricao`. PR para `main`.
- Commits em português, no imperativo, descrevendo o que muda.

## Roteiro de desenvolvimento

O projeto é feito **por partes, um caso de uso por vez**. Cada parte é revisada
e aprovada antes da próxima.

| Fase | Entrega                                                                                                        | Situação                                                   |
| ---- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 0    | Definições: casos de uso, regras, planilha modelo, README                                                      | ✅ concluída (revisão em andamento)                        |
| 1    | Fundação: monorepo, config, API com `/health` e `/me`, web conectando à API, CI                                | ✅ concluída (PR #1)                                       |
| 2    | Banco: projeto Supabase, migrations, RLS, views de saldo, seed, Drizzle na API                                 | ✅ branch `fase-2/banco` (em revisão)                      |
| 3    | Administração: login, papéis, usuários, processos (UC01–UC03)                                                  | 🔄 UC01 ✅ (PR #3) · UC02 na branch `fase-3/uc02-usuarios` |
| 4    | Engenharia: projetos, planilha modelo, importação, cadastro manual, edição/cancelamento, liberação (UC04–UC08) | ⏳                                                         |
| 5    | Produção: consulta, busca por código, recebimento, estorno (UC09–UC12)                                         | ⏳                                                         |
| 6    | PCP: painel, relatório XLSX/PDF, histórico (UC13–UC15)                                                         | ⏳                                                         |
| 7    | Piloto com uma carga real, em paralelo com a planilha atual                                                    | ⏳                                                         |

## Fora do escopo (por enquanto)

Leitura de QR/código de barras; integração com o ERP; anexar desenhos aos itens;
notificações de atraso; Compras como usuário; atualização em tempo real entre
conferentes.

Decidido que **não** entra: fornecedor, pedido de compra, prazo, unidade e NF;
registro de peças que não estão em nenhuma solicitação; **controle de sobras
(almoxarifado)**; distribuição automática de comerciais entre projetos;
exportação da planilha para compras pelo sistema.
