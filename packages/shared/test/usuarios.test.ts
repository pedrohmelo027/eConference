import { describe, expect, it } from 'vitest'
import { AtualizarUsuarioSchema, CriarUsuarioSchema } from '../src/index.js'

describe('CriarUsuarioSchema', () => {
  it('normaliza e-mail e nome', () => {
    const r = CriarUsuarioSchema.parse({
      nome: '  Maria Silva ',
      email: ' Maria.Silva@RotexMaquinas.com.br ',
      papel: 'producao',
      senhaProvisoria: 'Rotex123',
    })
    expect(r.email).toBe('maria.silva@rotexmaquinas.com.br')
    expect(r.nome).toBe('Maria Silva')
  })

  it('recusa e-mail inválido, papel desconhecido e senha curta', () => {
    const base = { nome: 'Ana', email: 'ana@rotex.com', papel: 'pcp', senhaProvisoria: 'Rotex1' }
    expect(CriarUsuarioSchema.safeParse(base).success).toBe(true)
    expect(CriarUsuarioSchema.safeParse({ ...base, email: 'ana' }).success).toBe(false)
    expect(CriarUsuarioSchema.safeParse({ ...base, papel: 'compras' }).success).toBe(false)
    expect(CriarUsuarioSchema.safeParse({ ...base, senhaProvisoria: '123' }).success).toBe(false)
  })
})

describe('AtualizarUsuarioSchema', () => {
  it('exige ao menos um campo', () => {
    expect(AtualizarUsuarioSchema.safeParse({}).success).toBe(false)
    expect(AtualizarUsuarioSchema.safeParse({ ativo: false }).success).toBe(true)
  })
})
