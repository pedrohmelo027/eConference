import { HealthResponseSchema } from '@econference/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { criarApp } from './helpers.js'

describe('GET /health', () => {
  let app: Awaited<ReturnType<typeof criarApp>>
  beforeAll(async () => {
    app = await criarApp()
  })
  afterAll(() => app.close())

  it('responde sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const corpo = HealthResponseSchema.parse(res.json())
    expect(corpo.status).toBe('ok')
    expect(corpo.banco).toBe('nao_configurado')
  })

  it('libera CORS para a origem do front', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:3000' },
    })
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000')
  })

  it.each(['PATCH', 'PUT', 'DELETE'])(
    'libera o método %s na consulta prévia (preflight)',
    async (metodo) => {
      const res = await app.inject({
        method: 'OPTIONS',
        url: '/usuarios/qualquer',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': metodo,
          'access-control-request-headers': 'authorization,content-type',
        },
      })
      expect(res.statusCode).toBe(204)
      expect(String(res.headers['access-control-allow-methods'])).toContain(metodo)
    },
  )

  it('não libera CORS para outra origem', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://outro-site.com' },
    })
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})

describe('rotas gerais', () => {
  let app: Awaited<ReturnType<typeof criarApp>>
  beforeAll(async () => {
    app = await criarApp()
  })
  afterAll(() => app.close())

  it('responde 404 em português', async () => {
    const res = await app.inject({ method: 'GET', url: '/nao-existe' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Rota GET /nao-existe não encontrada.',
    })
  })

  it('publica o OpenAPI com /health e /me', async () => {
    const res = await app.inject({ method: 'GET', url: '/openapi.json' })
    expect(res.statusCode).toBe(200)
    const doc = res.json<{ openapi: string; paths: Record<string, unknown> }>()
    expect(doc.openapi).toMatch(/^3\./)
    expect(Object.keys(doc.paths)).toEqual(expect.arrayContaining(['/health', '/me']))
    expect(Object.keys(doc.paths)).not.toContain('/openapi.json')
  })
})
