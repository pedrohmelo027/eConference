import { MeResponseSchema } from '@econference/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { comoUsuario, criarApp, gerarToken, USUARIO_ID, USUARIOS } from './helpers.js'

describe('GET /me', () => {
  let app: Awaited<ReturnType<typeof criarApp>>
  beforeAll(async () => {
    app = await criarApp()
  })
  afterAll(() => app.close())

  const get = (authorization?: string) =>
    app.inject({
      method: 'GET',
      url: '/me',
      headers: authorization ? { authorization } : {},
    })

  it('devolve o perfil do usuário do token', async () => {
    const res = await get(`Bearer ${await gerarToken()}`)
    expect(res.statusCode).toBe(200)
    expect(MeResponseSchema.parse(res.json())).toEqual({
      id: USUARIO_ID,
      email: 'engenharia@rotexmaquinas.com.br',
      nome: 'Usuário engenharia',
      papel: 'engenharia',
      trocaSenhaPendente: false,
    })
  })

  it('responde para quem ainda precisa trocar a senha (o front leva ao primeiro acesso)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: await comoUsuario(USUARIOS.trocaPendente),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json<{ trocaSenhaPendente: boolean }>().trocaSenhaPendente).toBe(true)
  })

  it('403 para usuário sem perfil', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: await comoUsuario(USUARIOS.semPerfil),
    })
    expect(res.statusCode).toBe(403)
    expect(res.json<{ message: string }>().message).toBe(
      'Usuário sem acesso ao eConference. Procure o administrador.',
    )
  })

  it('403 para usuário desativado', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: await comoUsuario(USUARIOS.desativado),
    })
    expect(res.statusCode).toBe(403)
    expect(res.json<{ message: string }>().message).toBe(
      'Usuário desativado. Procure o administrador.',
    )
  })

  it('401 sem token', async () => {
    const res = await get()
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Token de acesso ausente.',
    })
  })

  it('401 com cabeçalho fora do padrão Bearer', async () => {
    const res = await get(`Token ${await gerarToken()}`)
    expect(res.statusCode).toBe(401)
  })

  it('401 com token assinado por outra chave', async () => {
    const res = await get(
      `Bearer ${await gerarToken({ segredo: 'outra-chave-qualquer-com-32-caracteres!' })}`,
    )
    expect(res.statusCode).toBe(401)
    expect(res.json<{ message: string }>().message).toBe('Token de acesso inválido ou expirado.')
  })

  it('401 com token expirado', async () => {
    const res = await get(`Bearer ${await gerarToken({ expiraEm: '-1m' })}`)
    expect(res.statusCode).toBe(401)
  })

  it('401 com token de outro projeto Supabase', async () => {
    const token = await gerarToken({ issuer: 'https://outro.supabase.co/auth/v1' })
    expect((await get(`Bearer ${token}`)).statusCode).toBe(401)
  })

  it('401 com token sem audiência "authenticated"', async () => {
    const token = await gerarToken({ audience: 'anon' })
    expect((await get(`Bearer ${token}`)).statusCode).toBe(401)
  })
})
