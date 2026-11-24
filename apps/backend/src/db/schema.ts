// Espelho em Drizzle das tabelas e views criadas pelas migrations em supabase/migrations.
// A fonte da verdade é o SQL: mudou uma migration, ajuste aqui. O Drizzle não gera migrations.
import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  pgView,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

const quando = (nome: string) => timestamp(nome, { withTimezone: true, mode: 'string' })
const criadoEm = () => quando('criado_em').notNull().defaultNow()
const atualizadoEm = () => quando('atualizado_em').notNull().defaultNow()

export const papel = pgEnum('papel', ['admin', 'engenharia', 'producao', 'pcp'])
export const tipoLancamento = pgEnum('tipo_lancamento', ['entrada', 'estorno'])

export const perfis = pgTable('perfis', {
  id: uuid('id').primaryKey(),
  nome: text('nome').notNull(),
  email: text('email').notNull(),
  papel: papel('papel').notNull(),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
})

export const processos = pgTable('processos', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  peso: numeric('peso', { precision: 6, scale: 2, mode: 'number' }).notNull(),
  ordem: smallint('ordem').notNull().default(0),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
})

export const projetos = pgTable('projetos', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  codigo: text('codigo'),
  encerradoEm: quando('encerrado_em'),
  criadoPor: uuid('criado_por').references(() => perfis.id),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
})

export const importacoes = pgTable('importacoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  projetoId: uuid('projeto_id')
    .notNull()
    .references(() => projetos.id),
  arquivo: text('arquivo').notNull(),
  linhas: integer('linhas').notNull(),
  avisos: jsonb('avisos').$type<unknown[]>().notNull().default([]),
  importadoPor: uuid('importado_por').references(() => perfis.id),
  importadoEm: quando('importado_em').notNull().defaultNow(),
})

export const solicitacoes = pgTable('solicitacoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  projetoId: uuid('projeto_id')
    .notNull()
    .references(() => projetos.id),
  titulo: text('titulo').notNull(),
  data: date('data', { mode: 'string' }).notNull(),
  hora: time('hora'),
  observacao: text('observacao'),
  importacaoId: uuid('importacao_id').references(() => importacoes.id),
  liberadaEm: quando('liberada_em'),
  liberadaPor: uuid('liberada_por').references(() => perfis.id),
  canceladaEm: quando('cancelada_em'),
  canceladaPor: uuid('cancelada_por').references(() => perfis.id),
  motivoCancelamento: text('motivo_cancelamento'),
  criadoPor: uuid('criado_por').references(() => perfis.id),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
})

export const solicitacaoItens = pgTable('solicitacao_itens', {
  id: uuid('id').primaryKey().defaultRandom(),
  solicitacaoId: uuid('solicitacao_id')
    .notNull()
    .references(() => solicitacoes.id, { onDelete: 'cascade' }),
  processoId: uuid('processo_id')
    .notNull()
    .references(() => processos.id),
  codigo: text('codigo').notNull(),
  codigoNormalizado: text('codigo_normalizado').generatedAlwaysAs(
    sql`upper(regexp_replace(btrim(codigo), '\\s+', ' ', 'g'))`,
  ),
  material: text('material'),
  medida: text('medida'),
  quantidade: integer('quantidade').notNull(),
  dataSolicitacao: date('data_solicitacao', { mode: 'string' }).notNull(),
  canceladoEm: quando('cancelado_em'),
  canceladoPor: uuid('cancelado_por').references(() => perfis.id),
  motivoCancelamento: text('motivo_cancelamento'),
  criadoPor: uuid('criado_por').references(() => perfis.id),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
})

/** Só INSERT (RN08). A API não tem privilégio de UPDATE/DELETE nesta tabela. */
export const recebimentoLancamentos = pgTable('recebimento_lancamentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id')
    .notNull()
    .references(() => solicitacaoItens.id),
  tipo: tipoLancamento('tipo').notNull(),
  quantidade: integer('quantidade').notNull(),
  estornaId: uuid('estorna_id'),
  motivo: text('motivo'),
  loteId: uuid('lote_id').notNull().defaultRandom(),
  lancadoPor: uuid('lancado_por')
    .notNull()
    .references(() => perfis.id),
  lancadoEm: quando('lancado_em').notNull().defaultNow(),
})

/** Preenchida só por gatilho. A API só lê. */
export const auditoria = pgTable('auditoria', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  tabela: text('tabela').notNull(),
  registroId: uuid('registro_id').notNull(),
  acao: text('acao', { enum: ['insert', 'update', 'delete'] }).notNull(),
  antes: jsonb('antes'),
  depois: jsonb('depois'),
  usuarioId: uuid('usuario_id'),
  em: quando('em').notNull(),
})

// ------------------------------------------------------------------ views (só leitura)

const percentual = (nome: string) => numeric(nome, { mode: 'number' })

export const vwItensSaldo = pgView('vw_itens_saldo', {
  id: uuid('id').notNull(),
  solicitacaoId: uuid('solicitacao_id').notNull(),
  projetoId: uuid('projeto_id').notNull(),
  processoId: uuid('processo_id').notNull(),
  processo: text('processo').notNull(),
  peso: numeric('peso', { mode: 'number' }).notNull(),
  codigo: text('codigo').notNull(),
  codigoNormalizado: text('codigo_normalizado').notNull(),
  material: text('material'),
  medida: text('medida'),
  dataSolicitacao: date('data_solicitacao', { mode: 'string' }).notNull(),
  solicitado: integer('solicitado').notNull(),
  recebido: integer('recebido').notNull(),
  saldo: integer('saldo').notNull(),
  percentual: percentual('percentual').notNull(),
  status: text('status', { enum: ['pendente', 'parcial', 'completo', 'cancelado'] }).notNull(),
  canceladoEm: quando('cancelado_em'),
  motivoCancelamento: text('motivo_cancelamento'),
  liberadaEm: quando('liberada_em'),
  ultimoRecebimentoEm: quando('ultimo_recebimento_em'),
}).existing()

const totais = {
  itens: integer('itens').notNull(),
  itensCompletos: integer('itens_completos').notNull(),
  itensComSaldo: integer('itens_com_saldo').notNull(),
  pecasSolicitadas: integer('pecas_solicitadas').notNull(),
  pecasRecebidas: integer('pecas_recebidas').notNull(),
  pecasFaltantes: integer('pecas_faltantes').notNull(),
  percentual: percentual('percentual'),
  percentualPonderado: percentual('percentual_ponderado'),
}

export const vwSolicitacoesResumo = pgView('vw_solicitacoes_resumo', {
  id: uuid('id').notNull(),
  projetoId: uuid('projeto_id').notNull(),
  projeto: text('projeto').notNull(),
  titulo: text('titulo').notNull(),
  data: date('data', { mode: 'string' }).notNull(),
  hora: time('hora'),
  observacao: text('observacao'),
  importacaoId: uuid('importacao_id'),
  liberadaEm: quando('liberada_em'),
  canceladaEm: quando('cancelada_em'),
  motivoCancelamento: text('motivo_cancelamento'),
  criadoEm: quando('criado_em').notNull(),
  status: text('status', { enum: ['rascunho', 'aberta', 'concluida', 'cancelada'] }).notNull(),
  itensCancelados: integer('itens_cancelados').notNull(),
  ...totais,
}).existing()

export const vwProjetosResumo = pgView('vw_projetos_resumo', {
  id: uuid('id').notNull(),
  nome: text('nome').notNull(),
  codigo: text('codigo'),
  encerradoEm: quando('encerrado_em'),
  criadoEm: quando('criado_em').notNull(),
  solicitacoesRascunho: integer('solicitacoes_rascunho').notNull(),
  solicitacoesAbertas: integer('solicitacoes_abertas').notNull(),
  solicitacoesConcluidas: integer('solicitacoes_concluidas').notNull(),
  solicitacoesCanceladas: integer('solicitacoes_canceladas').notNull(),
  ...totais,
}).existing()
