import { describe, expect, it } from 'vitest'
import { lerEnv } from '../src/env.js'

describe('lerEnv', () => {
  it('aplica os padrões e separa as origens de CORS', () => {
    const env = lerEnv({
      SUPABASE_URL: 'https://abc.supabase.co/',
      CORS_ORIGIN: 'http://localhost:3000, https://econference.vercel.app',
      SUPABASE_JWT_SECRET: '',
    })
    expect(env.PORT).toBe(3333)
    expect(env.SUPABASE_URL).toBe('https://abc.supabase.co')
    expect(env.CORS_ORIGIN).toEqual(['http://localhost:3000', 'https://econference.vercel.app'])
    expect(env.SUPABASE_JWT_SECRET).toBeUndefined()
  })

  it('falha com mensagem em português quando falta SUPABASE_URL', () => {
    expect(() => lerEnv({})).toThrow(/Variáveis de ambiente inválidas/)
  })
})
