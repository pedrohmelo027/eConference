import { describe, expect, it } from 'vitest'
import {
  HealthResponseSchema,
  MeResponseSchema,
  NOMES_PAPEIS,
  PAPEIS,
  PapelSchema,
} from '../src/index.js'

describe('papéis', () => {
  it('tem os quatro papéis do README, todos com nome', () => {
    expect(PAPEIS).toEqual(['admin', 'engenharia', 'producao', 'pcp'])
    for (const papel of PAPEIS) expect(NOMES_PAPEIS[papel]).toBeTruthy()
  })

  it('recusa papel desconhecido', () => {
    expect(PapelSchema.safeParse('compras').success).toBe(false)
  })
})

describe('schemas', () => {
  it('aceita uma resposta de /health válida', () => {
    const r = HealthResponseSchema.safeParse({
      status: 'ok',
      servico: 'econference-api',
      versao: '0.1.0',
      horario: new Date().toISOString(),
      banco: 'ok',
    })
    expect(r.success).toBe(true)
  })

  it('exige id uuid em /me e aceita e-mail nulo', () => {
    expect(MeResponseSchema.safeParse({ id: 'abc', email: null }).success).toBe(false)
    expect(
      MeResponseSchema.safeParse({ id: '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b', email: null })
        .success,
    ).toBe(true)
  })
})
