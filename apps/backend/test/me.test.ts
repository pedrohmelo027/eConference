import { MeResponseSchema } from '@econference/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { criarApp, gerarToken, USUARIO_ID } from './helpers.js'

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

  it('devolve o usuário do token', async () => {
    const res = await get(`Bearer ${await gerarToken()}`)
    expect(res.statusCode).toBe(200)
    expect(MeResponseSchema.parse(res.json())).toEqual({
      id: USUARIO_ID,
      email: 'engenharia@rotex.com.br',
    })
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
