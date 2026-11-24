import { describe, expect, it } from 'vitest'
import {
  HealthResponseSchema,
  MeResponseSchema,
  NOMES_PAPEIS,
  NovaSenhaSchema,
  PAPEIS,
  PapelSchema,
  TELA_INICIAL,
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

  it('/me exige id uuid e papel conhecido', () => {
    const me = {
      id: '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b',
      email: 'a@rotexmaquinas.com.br',
      nome: 'A',
      papel: 'pcp',
      trocaSenhaPendente: false,
    }
    expect(MeResponseSchema.safeParse(me).success).toBe(true)
    expect(MeResponseSchema.safeParse({ ...me, id: 'abc' }).success).toBe(false)
    expect(MeResponseSchema.safeParse({ ...me, papel: 'compras' }).success).toBe(false)
  })

  it('nova senha: 8+ caracteres com letra e número', () => {
    expect(NovaSenhaSchema.safeParse('Rotex2026').success).toBe(true)
    expect(NovaSenhaSchema.safeParse('curta1').success).toBe(false)
    expect(NovaSenhaSchema.safeParse('somenteletras').success).toBe(false)
    expect(NovaSenhaSchema.safeParse('12345678').success).toBe(false)
  })

  it('toda tela inicial começa com /', () => {
    for (const papel of PAPEIS) expect(TELA_INICIAL[papel]).toMatch(/^\//)
  })
})
