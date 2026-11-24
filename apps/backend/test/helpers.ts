import type { Papel } from '@econference/shared'
import { SignJWT } from 'jose'
import { buildApp } from '../src/build-app.js'
import { lerEnv } from '../src/env.js'
import type { PerfilAcesso, RepositorioPerfis } from '../src/perfis.js'

export const SUPABASE_URL = 'https://teste.supabase.co'
export const SEGREDO = 'segredo-de-teste-com-pelo-menos-32-caracteres'

/** Usuários de teste: um por papel, mais casos especiais. */
export const USUARIOS = {
  admin: '00000000-0000-4000-8000-000000000001',
  engenharia: '00000000-0000-4000-8000-000000000002',
  producao: '00000000-0000-4000-8000-000000000003',
  pcp: '00000000-0000-4000-8000-000000000004',
  trocaPendente: '00000000-0000-4000-8000-000000000005',
  desativado: '00000000-0000-4000-8000-000000000006',
  semPerfil: '00000000-0000-4000-8000-000000000007',
} as const
export const USUARIO_ID = USUARIOS.engenharia

function perfil(id: string, papel: Papel, extra: Partial<PerfilAcesso> = {}): PerfilAcesso {
  return {
    id,
    nome: `Usuário ${papel}`,
    email: `${papel}@rotexmaquinas.com.br`,
    papel,
    ativo: true,
    trocaSenhaPendente: false,
    ...extra,
  }
}

export const PERFIS_TESTE: PerfilAcesso[] = [
  perfil(USUARIOS.admin, 'admin'),
  perfil(USUARIOS.engenharia, 'engenharia'),
  perfil(USUARIOS.producao, 'producao'),
  perfil(USUARIOS.pcp, 'pcp'),
  perfil(USUARIOS.trocaPendente, 'producao', { trocaSenhaPendente: true }),
  perfil(USUARIOS.desativado, 'engenharia', { ativo: false }),
]

export function repositorioEmMemoria(lista: PerfilAcesso[] = PERFIS_TESTE): RepositorioPerfis {
  return { buscar: async (id) => lista.find((p) => p.id === id) ?? null }
}

export const envTeste = lerEnv({
  NODE_ENV: 'test',
  SUPABASE_URL,
  SUPABASE_JWT_SECRET: SEGREDO,
  CORS_ORIGIN: 'http://localhost:3000',
})

/** App sem banco (db: null) e com perfis em memória. Integração com banco: banco.test.ts. */
export function criarApp() {
  return buildApp({ env: envTeste, db: null, perfis: repositorioEmMemoria() })
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
  email = 'engenharia@rotexmaquinas.com.br',
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

/** Cabeçalho Authorization para um usuário de teste. */
export async function comoUsuario(id: string) {
  return { authorization: `Bearer ${await gerarToken({ sub: id })}` }
}
