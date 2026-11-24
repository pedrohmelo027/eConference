import { SignJWT } from 'jose'
import { buildApp } from '../src/build-app.js'
import { lerEnv } from '../src/env.js'

export const SUPABASE_URL = 'https://teste.supabase.co'
export const SEGREDO = 'segredo-de-teste-com-pelo-menos-32-caracteres'
export const USUARIO_ID = '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b'

export const envTeste = lerEnv({
  NODE_ENV: 'test',
  SUPABASE_URL,
  SUPABASE_JWT_SECRET: SEGREDO,
  CORS_ORIGIN: 'http://localhost:3000',
})

/** App sem banco (db: null). Testes de integração com banco usam DATABASE_URL (banco.test.ts). */
export function criarApp() {
  return buildApp({ env: envTeste, db: null })
}

interface OpcoesToken {
  sub?: string
  email?: string
  issuer?: string
  audience?: string
  segredo?: string
  expiraEm?: string
}

/** Gera um access token no formato do Supabase (HS256). */
export function gerarToken({
  sub = USUARIO_ID,
  email = 'engenharia@rotex.com.br',
  issuer = `${SUPABASE_URL}/auth/v1`,
  audience = 'authenticated',
  segredo = SEGREDO,
  expiraEm = '1h',
}: OpcoesToken = {}) {
  return new SignJWT({ email, role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiraEm)
    .sign(new TextEncoder().encode(segredo))
}
