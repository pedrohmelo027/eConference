# eConference — Casos de uso (v3, 24/11/2026)

v3: novo fluxo de trabalho e decisões de 24/11 (seção 7). Sai a distribuição de
comerciais e o status "excedente"; sai a exportação para compras; entra a planilha
modelo do eConference e a liberação da solicitação para PCP e Produção.

## 1. Atores

| Ator              | Quem é                                  | O que faz no sistema                                          |
| ----------------- | --------------------------------------- | ------------------------------------------------------------- |
| **Administrador** | TI / responsável pelo sistema           | **tudo** o que os outros fazem + usuários, papéis e processos |
| **Engenharia**    | quem monta a planilha para compras      | gerencia projetos, importa e libera solicitações              |
| **Produção**      | quem recebe as peças no chão de fábrica | marca o que foi entregue e em que quantidade                  |
| **PCP**           | planejamento e controle da produção     | **só visualiza**: consulta, painel, relatórios e histórico    |

_Compras_ não usa o sistema: recebe da engenharia, por e-mail, a planilha modelo
preenchida.

## 2. Fluxo de trabalho

```
1. Engenharia cadastra o projeto ............................ UC04
2. Engenharia baixa a planilha modelo e preenche ............. UC05
3. Engenharia envia a planilha para compras (fora do sistema)
4. Engenharia importa a planilha no projeto (rascunho) ....... UC05
5. Engenharia confere/corrige e libera ....................... UC07, UC08
6. Produção recebe as peças, item por item ................... UC10, UC11, UC12
7. PCP acompanha e extrai relatórios ......................... UC13, UC14, UC15
```

Uma planilha = **uma solicitação** de **um projeto**. Antes de liberada, a
solicitação é um rascunho que só Engenharia e Admin enxergam.

**Sobras:** a Produção só registra até o que foi solicitado. O que chegar a mais
vai para o almoxarifado e **não é controlado** pelo eConference nesta versão.

## 3. Visão geral

| ID   | Caso de uso                              | Admin | Engenharia | Produção | PCP |
| ---- | ---------------------------------------- | :---: | :--------: | :------: | :-: |
| UC01 | Entrar no sistema                        |   ✔   |     ✔      |    ✔     |  ✔  |
| UC02 | Gerenciar usuários e papéis              |   ✔   |            |          |     |
| UC03 | Gerenciar processos e pesos              |   ✔   |            |          |     |
| UC04 | Gerenciar projetos                       |   ✔   |     ✔      |          |     |
| UC05 | Importar planilha de solicitação         |   ✔   |     ✔      |          |     |
| UC06 | Cadastrar solicitação / item manualmente |   ✔   |     ✔      |          |     |
| UC07 | Editar ou cancelar solicitação / item    |   ✔   |     ✔      |          |     |
| UC08 | Liberar solicitação para PCP e Produção  |   ✔   |     ✔      |          |     |
| UC09 | Consultar solicitações e itens           |   ✔   |     ✔      |    ✔     |  ✔  |
| UC10 | Buscar peça por código                   |   ✔   |     ✔      |    ✔     |  ✔  |
| UC11 | Registrar recebimento                    |   ✔   |            |    ✔     |     |
| UC12 | Corrigir (estornar) um recebimento       |   ✔   |            |    ✔     |     |
| UC13 | Acompanhar andamento (painel)            |   ✔   |     ✔      |    ✔     |  ✔  |
| UC14 | Extrair relatório                        |   ✔   |     ✔      |    ✔     |  ✔  |
| UC15 | Consultar histórico de alterações        |   ✔   |     ✔      |    ✔     |  ✔  |

## 4. Casos de uso detalhados

### UC01 — Entrar no sistema

**Ator:** todos.
**Fluxo:** informa e-mail e senha → sistema abre a tela inicial do papel (Engenharia → solicitações; Produção → conferência; PCP → painel; Admin → painel).
**Alternativos:** credenciais inválidas → erro; usuário sem papel ou desativado → aviso para procurar o administrador; esqueceu a senha → link por e-mail.
**Regra:** não há cadastro público; só o administrador cria usuários.

### UC02 — Gerenciar usuários e papéis

**Ator:** Administrador.
**Fluxo:** cria usuário (nome, e-mail, papel) → convite por e-mail; altera papel ou desativa.
**Regras:** usuário desativado não entra, mas o histórico dele continua; um papel por usuário.

### UC03 — Gerenciar processos e pesos

**Ator:** Administrador.
**Fluxo:** lista os processos (Corte Laser 5, Corte e Dobra 5, Oxicorte 4, Roletes 3, Matéria-Prima 3, Comerciais 1); cria, renomeia, altera peso ou desativa.
**Regras:** processo em uso só pode ser desativado, não excluído; mudar o peso recalcula o andamento ponderado; a lista de processos da planilha modelo vem daqui.

### UC04 — Gerenciar projetos

**Atores:** Engenharia, Administrador.
**Fluxo:** cadastra projeto (nome, ex.: "Esteira 24 ASTA"; código opcional); edita; encerra ou reabre.
**Regras:** toda solicitação pertence a um projeto cadastrado; projeto encerrado não recebe novas solicitações, mas continua nas consultas e relatórios.

### UC05 — Importar planilha de solicitação ★

**Atores:** Engenharia, Administrador.
**Pré-condição:** projeto cadastrado e ativo (UC04).
**Fluxo principal:**

1. Baixa a **planilha modelo** do eConference (layout na seção 5), preenche e envia para compras por fora do sistema.
2. No projeto, escolhe "Importar planilha" e envia o arquivo preenchido.
3. Sistema lê o cabeçalho (título, data, hora, observação) e os itens.
4. Mostra uma **prévia**: projeto, título, data, nº de itens e de peças, itens por processo, avisos e erros.
5. Usuário confere e confirma.
6. Sistema grava a solicitação e os itens numa única transação, com status **rascunho**, e mostra o resumo.

**Avisos (não bloqueiam, mas são destacados na prévia):**

- mesmo código com **medida diferente** em outra solicitação (RN13) — provável erro na planilha;
- solicitação que parece já importada (mesmo projeto, título e data);
- nome do projeto escrito na planilha diferente do projeto escolhido.

**Erros (bloqueiam):** arquivo fora do modelo (aba ou colunas faltando); título ou data vazios; linha sem processo, código ou quantidade; quantidade não inteira ou ≤ 0; processo inexistente ou desativado; mesmo código repetido na planilha; projeto encerrado.

### UC06 — Cadastrar solicitação / item manualmente

**Atores:** Engenharia, Administrador.
**Fluxo:** no projeto, informa título, data e observação; adiciona itens (processo, código/descrição, material, medida, quantidade); salva como **rascunho**.
**Fluxo alternativo — pedir de novo:** para mais peças de um item já solicitado, a engenharia cadastra um **novo item** (nova solicitação ou mesma solicitação com nova data de solicitação), controlado separadamente do original.
**Regra:** depois de liberado, a quantidade de um item não aumenta (RN09).

### UC07 — Editar ou cancelar solicitação / item

**Atores:** Engenharia, Administrador.
**Em rascunho:** tudo pode ser corrigido (título, data, observação, processo, código, material, medida, quantidade), itens podem ser adicionados ou removidos e a solicitação pode ser descartada.
**Depois de liberada:** corrige dados descritivos (título, observação, código, material, medida, processo); a quantidade **só pode ser reduzida**, e não abaixo do já recebido; itens e solicitação só podem ser **cancelados**, informando o motivo.
**Regra:** toda alteração fica no histórico (UC15).

### UC08 — Liberar solicitação para PCP e Produção ★

**Atores:** Engenharia, Administrador.
**Fluxo:** abre a solicitação em rascunho → confere → "Liberar" → sistema registra quem e quando liberou, e a solicitação passa a **aberta**.
**Regras:** só libera solicitação com pelo menos um item; depois de liberada não volta a rascunho; só solicitações liberadas aparecem para PCP e Produção e podem receber peças.

### UC09 — Consultar solicitações e itens

**Atores:** todos (PCP e Produção só veem liberadas).
**Fluxo:** lista solicitações com filtros (projeto, data, processo, status) e % recebido; ao abrir, vê itens com solicitado, recebido, saldo e status.

### UC10 — Buscar peça por código

**Atores:** todos (principal: Produção).
**Fluxo:** digita parte do código → sistema mostra todas as linhas **liberadas e com saldo** com aquele código, com projeto, solicitação, data e saldo. Para a Produção, segue para UC11.

### UC11 — Registrar recebimento ★

**Atores:** Produção, Administrador.
Vale para **todos os processos**, inclusive Comerciais. A peça é identificada pelo desenho/descrição e quem recebe escolhe a linha.
**Fluxo principal:**

1. Abre a solicitação (ou chega pelo UC10).
2. No item, marca "entregue" (lança o saldo inteiro) ou informa a quantidade recebida.
3. Sistema grava o lançamento (quantidade, data/hora, quem lançou) e atualiza saldo e status.

**Alternativos:**

- _Parcial:_ quantidade menor que o saldo → item "parcial", falta em destaque.
- _Em várias vezes:_ cada chegada é um novo lançamento; recebido = soma.
- _Vários itens de uma vez:_ marca vários e confirma num só envio (tudo ou nada).
- _Chegou mais que o saldo:_ o sistema **não aceita** quantidade acima do saldo. A Produção lança só o saldo; a sobra vai para o almoxarifado e não é registrada.

**Regras:** registra **só a entrega e a quantidade** (sem NF, fornecedor ou observação). Só itens de solicitações liberadas; peça fora de qualquer solicitação **não é registrada**. Lançamento nunca é apagado; correção pelo UC12.

### UC12 — Corrigir (estornar) um recebimento

**Atores:** Produção, Administrador.
**Fluxo:** abre o histórico do item → escolhe o lançamento → estorna informando o motivo → sistema recalcula saldo e status.
**Regras:** o lançamento original e o estorno ficam visíveis no histórico; um lançamento só pode ser estornado uma vez; um estorno não pode ser estornado (para refazer, lança-se de novo).

### UC13 — Acompanhar andamento (painel)

**Atores:** todos (principal: PCP).
**Fluxo:** % geral ponderado por processo e % simples; totais (itens, completos, com saldo, peças solicitadas, recebidas, faltantes); andamento por processo, projeto e solicitação; filtros por projeto, período e processo.

### UC14 — Extrair relatório ★

**Atores:** todos (principal: PCP).
**Fluxo:** escolhe o recorte (projeto, solicitação, processo, status, período) → sistema mostra por item: código, solicitação, processo, solicitado, recebido, saldo, **% recebido** e status; subtotais por processo e solicitação; % geral ponderado e simples → exporta **XLSX** ou **PDF**.
**Variação:** "somente o que não chegou".

### UC15 — Consultar histórico de alterações

**Atores:** todos.
**Fluxo:** linha do tempo de uma solicitação ou item: criação/importação, edições, liberação, cancelamentos, recebimentos e estornos — quem e quando.

## 5. Planilha modelo (entrada do UC05)

Arquivo `.xlsx` gerado pelo eConference. Uma planilha = uma solicitação.

**Aba `Solicitação`**

Cabeçalho:

| Campo      | Obrigatório | Exemplo                                                           |
| ---------- | :---------: | ----------------------------------------------------------------- |
| Projeto    |      ✔      | Esteira 24 ASTA (conferido com o projeto escolhido na importação) |
| Título     |      ✔      | Módulos motor - esteiras 24 ASTA                                  |
| Data       |      ✔      | 17/11/2026                                                        |
| Hora       |             | 09:39                                                             |
| Observação |             | anexo PÉS INCLINADOS.rar                                          |

Tabela de itens, logo abaixo:

| Coluna             | Obrigatório | Exemplo                                                   |
| ------------------ | :---------: | --------------------------------------------------------- |
| Processo           |      ✔      | Corte Laser (lista suspensa com os processos ativos)      |
| Código / Descrição |      ✔      | ET024-MA-001-008 ou PARAFUSO SEXTAVADO DIN 933 - M10 X 20 |
| Material           |             | SAE 1020                                                  |
| Medida             |             | 9,525 mm                                                  |
| Quantidade         |      ✔      | 4 (inteiro > 0)                                           |

Também traz uma aba **`Resumo`** (peças por processo, com fórmulas, para compras) e uma aba **`Instruções`**. A importação lê só a aba `Solicitação`.

## 6. Regras de negócio

| ID   | Regra                                                                                                                                                                                                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RN01 | Cada item pertence a uma solicitação, e cada solicitação a um projeto. O mesmo código pode estar em várias solicitações e cada linha é controlada separadamente. Não há distribuição automática: quem recebe escolhe a linha. |
| RN02 | Toda peça recebida pertence a um item de uma solicitação **liberada**. Peça sem solicitação não é registrada.                                                                                                                 |
| RN03 | Recebido do item = soma dos lançamentos − soma dos estornos.                                                                                                                                                                  |
| RN04 | Status do item: pendente (recebido = 0), parcial (< solicitado), completo (= solicitado) ou cancelado.                                                                                                                        |
| RN05 | Status da solicitação: rascunho (não liberada), aberta (liberada, com algum item com saldo), concluída (todos os itens completos ou cancelados) ou cancelada.                                                                 |
| RN06 | % do item = recebido ÷ solicitado.                                                                                                                                                                                            |
| RN07 | % ponderado = Σ(recebido × peso) ÷ Σ(solicitado × peso), sem itens cancelados.                                                                                                                                                |
| RN08 | Lançamentos e alterações nunca são apagados; tudo vai para o histórico. Exceção: solicitação em rascunho pode ser descartada (fica registrado no histórico).                                                                  |
| RN09 | Depois de liberada, a quantidade solicitada nunca aumenta; pode ser reduzida até o já recebido. Para pedir mais, cadastra-se um novo item.                                                                                    |
| RN10 | O mesmo código pode aparecer mais de uma vez no mesmo projeto, desde que em outra solicitação ou com outra data de solicitação.                                                                                               |
| RN11 | O recebido de um item **nunca ultrapassa** o solicitado. Sobra vai para o almoxarifado, fora do sistema.                                                                                                                      |
| RN12 | Permissões: Admin faz tudo; Engenharia gerencia projetos e solicitações e libera; Produção registra e estorna recebimentos; PCP só visualiza. PCP e Produção só enxergam solicitações liberadas.                              |
| RN13 | Mesmo código com medida diferente entre solicitações é tratado como possível erro de planilha e gera aviso na importação.                                                                                                     |

## 7. Decisões

**24/11/2026 — primeira rodada (engenharia)**

1. ET024-MA-001-008 com duas medidas: erro na planilha (RN13).
2. Produção só marca que foi entregue e a quantidade (sem NF/fornecedor).
3. Engenharia não aumenta quantidades; cadastra o item de novo (RN09, RN10).
4. Peça que não está em solicitação de um projeto cadastrado não é registrada.
5. PCP só consulta. Admin faz tudo; Engenharia gerencia; Produção marca.

**24/11/2026 — segunda rodada (novo fluxo)** 6. O eConference fornece a **planilha modelo** (layout novo). A engenharia preenche, envia para compras por fora e depois importa. 7. **Um projeto por importação:** uma planilha = uma solicitação de um projeto. (Resolve a antiga pergunta A.) 8. Solicitação importada fica em **rascunho**; a engenharia **libera** para PCP e Produção (UC08). 9. **Sem controle de sobras:** o recebido não passa do solicitado; a sobra vai para o almoxarifado. Sai a distribuição de comerciais, o status "excedente" e as antigas perguntas B, C e D. 10. **Sai a exportação para compras** (antigo UC08): compras recebe a própria planilha preenchida.

## 8. Fora do escopo

QR/código de barras; integração com ERP; anexar desenhos; notificações; **fornecedor, pedido de compra, prazo, NF e unidade**; Compras como usuário; registro de peças sem solicitação; **controle de sobras / almoxarifado**; exportação para compras.
