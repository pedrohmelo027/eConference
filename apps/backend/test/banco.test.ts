// Integração com o banco real. Roda só quando DATABASE_URL está definida (apps/backend/.env);
// no CI, sem banco, é pulado. Tudo acontece em transações desfeitas no final.
import { eq, sql } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import * as schema from '../src/db/schema.js'
import { lerEnv } from '../src/env.js'
import { bancoResponde, criarDb } from '../src/plugins/db.js'
import { erroDoPostgres } from '../src/plugins/erros.js'

try {
  process.loadEnvFile()
} catch {
  // sem .env
}
const url = process.env.DATABASE_URL

class Desfazer extends Error {}

describe.skipIf(!url)('banco (integração)', () => {
  const { cliente, db } = criarDb(
    lerEnv({ ...process.env, SUPABASE_URL: 'https://x.supabase.co' }).DATABASE_URL!,
  )
  afterAll(() => cliente.end({ timeout: 5 }))

  /** Roda `fn` numa transação e desfaz tudo no final. */
  async function emTransacaoDesfeita(
    fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<void>,
  ) {
    await expect(
      db.transaction(async (tx) => {
        await fn(tx)
        throw new Desfazer()
      }),
    ).rejects.toBeInstanceOf(Desfazer)
  }

  it('conecta como econference_api pelo pooler', async () => {
    expect(await bancoResponde(db)).toBe(true)
    const [linha] = await db.execute<{ usuario: string }>(sql`select current_user as usuario`)
    expect(linha?.usuario).toBe('econference_api')
  })

  it('tem os 6 processos iniciais com os pesos do README', async () => {
    const processos = await db
      .select({ nome: schema.processos.nome, peso: schema.processos.peso })
      .from(schema.processos)
      .orderBy(schema.processos.ordem)
    expect(processos).toEqual([
      { nome: 'Corte Laser', peso: 5 },
      { nome: 'Corte e Dobra', peso: 5 },
      { nome: 'Oxicorte', peso: 4 },
      { nome: 'Roletes', peso: 3 },
      { nome: 'Matéria-Prima', peso: 3 },
      { nome: 'Comerciais', peso: 1 },
    ])
  })

  it('não tem acesso ao schema auth', async () => {
    const erro = await db.execute(sql`select 1 from auth.users limit 1`).catch((e: unknown) => e)
    expect(erroDoPostgres(erro)?.code).toBe('42501') // insufficient_privilege
  })

  it('não consegue alterar lançamentos (só insert)', async () => {
    const erro = await db
      .update(schema.recebimentoLancamentos)
      .set({ quantidade: 1 })
      .where(eq(schema.recebimentoLancamentos.id, '00000000-0000-0000-0000-000000000000'))
      .catch((e: unknown) => e)
    expect(erroDoPostgres(erro)?.code).toBe('42501')
  })

  it('regras do banco chegam como P0001 em português e as views calculam o saldo', async () => {
    await emTransacaoDesfeita(async (tx) => {
      const [laser] = await tx
        .select({ id: schema.processos.id })
        .from(schema.processos)
        .where(eq(schema.processos.nome, 'Corte Laser'))
      const [projeto] = await tx
        .insert(schema.projetos)
        .values({ nome: `Teste integração ${Date.now()}` })
        .returning({ id: schema.projetos.id })
      const [sol] = await tx
        .insert(schema.solicitacoes)
        .values({ projetoId: projeto!.id, titulo: 'Teste', data: '2026-11-24' })
        .returning({ id: schema.solicitacoes.id })
      await tx.insert(schema.solicitacaoItens).values({
        solicitacaoId: sol!.id,
        processoId: laser!.id,
        codigo: ' et024-ma-001-008 ',
        quantidade: 4,
        dataSolicitacao: '2026-11-24',
      })

      const [item] = await tx
        .select()
        .from(schema.vwItensSaldo)
        .where(eq(schema.vwItensSaldo.solicitacaoId, sol!.id))
      expect(item).toMatchObject({
        codigoNormalizado: 'ET024-MA-001-008',
        solicitado: 4,
        recebido: 0,
        saldo: 4,
        status: 'pendente',
        peso: 5,
      })

      const [resumo] = await tx
        .select({ status: schema.vwSolicitacoesResumo.status })
        .from(schema.vwSolicitacoesResumo)
        .where(eq(schema.vwSolicitacoesResumo.id, sol!.id))
      expect(resumo?.status).toBe('rascunho')

      // savepoint: a transação continua depois do erro esperado
      const [vazia] = await tx
        .insert(schema.solicitacoes)
        .values({ projetoId: projeto!.id, titulo: 'Sem itens', data: '2026-11-24' })
        .returning({ id: schema.solicitacoes.id })
      const erro = await tx
        .transaction(async (sp) => {
          await sp
            .update(schema.solicitacoes)
            .set({ liberadaEm: new Date().toISOString() })
            .where(eq(schema.solicitacoes.id, vazia!.id))
        })
        .catch((e: unknown) => e)
      expect(erroDoPostgres(erro)).toEqual({
        code: 'P0001',
        message: 'Só é possível liberar uma solicitação com pelo menos um item.',
      })
    })
  })
})
