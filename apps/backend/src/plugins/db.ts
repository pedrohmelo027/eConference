import { sql } from 'drizzle-orm'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import fp from 'fastify-plugin'
import postgres from 'postgres'
import * as schema from '../db/schema.js'
import type { Env } from '../env.js'

export type Db = PostgresJsDatabase<typeof schema>
export type Transacao = Parameters<Parameters<Db['transaction']>[0]>[0]

declare module 'fastify' {
  interface FastifyInstance {
    /** Nulo quando DATABASE_URL não está definida (ex.: testes sem banco). */
    db: Db | null
  }
}

/**
 * Conexão com o Postgres pelo pooler do Supabase (modo transaction, porta 6543).
 * Sem prepared statements (o pooler não suporta) e com poucas conexões (serverless).
 */
export function criarDb(url: string) {
  const cliente = postgres(url, {
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: { application_name: 'econference-api' },
  })
  return { cliente, db: drizzle(cliente, { schema }) }
}

export const dbPlugin = fp<{ env: Env; db?: Db | null }>(
  async (app, opcoes) => {
    if (opcoes.db !== undefined) {
      app.decorate('db', opcoes.db)
      return
    }
    if (!opcoes.env.DATABASE_URL) {
      app.decorate('db', null)
      return
    }
    const { cliente, db } = criarDb(opcoes.env.DATABASE_URL)
    app.decorate('db', db)
    app.addHook('onClose', async () => {
      await cliente.end({ timeout: 5 })
    })
  },
  { name: 'db', dependencies: ['@fastify/sensible'] },
)

/**
 * Executa `fn` numa transação em nome do usuário: o id vai para `app.usuario_id`,
 * que os gatilhos de auditoria gravam no histórico (RN08).
 */
export async function emNomeDe<T>(
  db: Db,
  usuarioId: string,
  fn: (tx: Transacao) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.usuario_id', ${usuarioId}, true)`)
    return fn(tx)
  })
}

/** Verifica se o banco responde (usado no /health). */
export async function bancoResponde(db: Db, timeoutMs = 3000): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined
  const limite = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs)
  })
  try {
    return await Promise.race([db.execute(sql`select 1`).then(() => true), limite])
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
