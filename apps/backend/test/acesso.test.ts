import type { Papel } from '@econference/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/build-app.js'
import { comoUsuario, criarApp, envTeste, USUARIOS } from './helpers.js'

describe('exigirPapel (RN12)', () => {
  let app: Awaited<ReturnType<typeof criarApp>>
  beforeAll(async () => {
    app = await criarApp()
    app.get(
      '/teste/engenharia',
      { onRequest: [app.authenticate, app.exigirPapel('engenharia')] },
      async () => ({ ok: true }),
    )
    app.get('/teste/qualquer', { onRequest: [app.authenticate, app.exigirPapel()] }, async () => ({
      ok: true,
    }))
  })
  afterAll(() => app.close())

  const chamar = async (url: string, usuario: string) =>
    app.inject({ method: 'GET', url, headers: await comoUsuario(usuario) })

  it.each<[Papel | 'admin', string, number]>([
    ['engenharia', USUARIOS.engenharia, 200],
    ['admin', USUARIOS.admin, 200],
    ['producao', USUARIOS.producao, 403],
    ['pcp', USUARIOS.pcp, 403],
  ])('rota de engenharia: %s → %i', async (_papel, usuario, status) => {
    expect((await chamar('/teste/engenharia', usuario)).statusCode).toBe(status)
  })

  it('papel errado recebe mensagem em português', async () => {
    const res = await chamar('/teste/engenharia', USUARIOS.pcp)
    expect(res.json<{ message: string }>().message).toBe(
      'Seu papel não tem permissão para esta ação.',
    )
  })

  it('sem papel definido: qualquer usuário ativo passa', async () => {
    expect((await chamar('/teste/qualquer', USUARIOS.pcp)).statusCode).toBe(200)
  })

  it('senha provisória bloqueia todas as rotas, até as sem papel', async () => {
    const res = await chamar('/teste/qualquer', USUARIOS.trocaPendente)
    expect(res.statusCode).toBe(403)
    expect(res.json<{ message: string }>().message).toBe(
      'Defina uma nova senha antes de continuar.',
    )
  })

  it('sem perfil e desativado: 403', async () => {
    expect((await chamar('/teste/qualquer', USUARIOS.semPerfil)).statusCode).toBe(403)
    expect((await chamar('/teste/qualquer', USUARIOS.desativado)).statusCode).toBe(403)
  })

  it('sem token: 401 antes de olhar o perfil', async () => {
    const res = await app.inject({ method: 'GET', url: '/teste/qualquer' })
    expect(res.statusCode).toBe(401)
  })
})

describe('sem banco', () => {
  it('rotas que precisam do perfil respondem 503', async () => {
    const app = await buildApp({ env: envTeste, db: null })
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: await comoUsuario(USUARIOS.admin),
    })
    expect(res.statusCode).toBe(503)
    expect(res.json<{ message: string }>().message).toBe('Banco de dados indisponível.')
    await app.close()
  })
})
