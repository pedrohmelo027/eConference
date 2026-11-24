import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { erroDoPostgres } from '../src/plugins/erros.js'
import { criarApp } from './helpers.js'

/** Simula o erro do postgres.js (com `code`) e o embrulho do Drizzle (em `cause`). */
function erroPg(code: string, message: string) {
  return Object.assign(new Error(message), { code })
}
function embrulhoDrizzle(causa: Error) {
  return Object.assign(new Error('Failed query: insert ...'), { cause: causa })
}

describe('erroDoPostgres', () => {
  it('lê o código direto ou dentro de cause', () => {
    expect(erroDoPostgres(erroPg('P0001', 'x'))).toEqual({ code: 'P0001', message: 'x' })
    expect(erroDoPostgres(embrulhoDrizzle(erroPg('23505', 'dup')))?.code).toBe('23505')
    expect(erroDoPostgres(new Error('comum'))).toBeNull()
    expect(erroDoPostgres(Object.assign(new Error('fs'), { code: 'ENOENT' }))).toBeNull()
  })
})

describe('tratamento de erros do banco', () => {
  let app: Awaited<ReturnType<typeof criarApp>>
  beforeAll(async () => {
    app = await criarApp()
    app.get('/teste/regra', async () => {
      throw embrulhoDrizzle(
        erroPg('P0001', 'Quantidade acima do saldo: o saldo é 1, foram informadas 2.'),
      )
    })
    app.get('/teste/duplicado', async () => {
      throw embrulhoDrizzle(erroPg('23505', 'duplicate key value violates unique constraint'))
    })
    app.get('/teste/inesperado', async () => {
      throw new Error('detalhe interno que não deve vazar')
    })
  })
  afterAll(() => app.close())

  it('regra do banco (P0001) vira 422 com a mensagem em português', async () => {
    const res = await app.inject({ method: 'GET', url: '/teste/regra' })
    expect(res.statusCode).toBe(422)
    expect(res.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      message: 'Quantidade acima do saldo: o saldo é 1, foram informadas 2.',
    })
  })

  it('chave duplicada (23505) vira 409', async () => {
    const res = await app.inject({ method: 'GET', url: '/teste/duplicado' })
    expect(res.statusCode).toBe(409)
  })

  it('erro inesperado vira 500 sem vazar detalhes', async () => {
    const res = await app.inject({ method: 'GET', url: '/teste/inesperado' })
    expect(res.statusCode).toBe(500)
    expect(res.json<{ message: string }>().message).toBe(
      'Erro interno no servidor. Tente novamente.',
    )
  })
})
