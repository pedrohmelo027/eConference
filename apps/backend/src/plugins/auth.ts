import type { FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyOptions } from 'jose'
import type { Env } from '../env.js'

/** Usuário identificado pelo access token do Supabase. O papel vem da tabela `perfis` (Fase 3). */
export interface UsuarioToken {
  id: string
  email: string | null
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    usuario: UsuarioToken | null
  }
}

/**
 * Valida `Authorization: Bearer <token>`.
 * Padrão: chaves públicas do projeto (JWKS). Com SUPABASE_JWT_SECRET: chave legada HS256.
 */
export const authPlugin = fp<{ env: Env }>(
  async (app, { env }) => {
    const issuer = `${env.SUPABASE_URL}/auth/v1`
    const opcoes: JWTVerifyOptions = { issuer, audience: 'authenticated' }

    const verificar: (token: string) => Promise<{ payload: JWTPayload }> = env.SUPABASE_JWT_SECRET
      ? (() => {
          const segredo = new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
          return (token) => jwtVerify(token, segredo, { ...opcoes, algorithms: ['HS256'] })
        })()
      : (() => {
          const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))
          return (token) => jwtVerify(token, jwks, opcoes)
        })()

    app.decorateRequest('usuario', null)

    app.decorate('authenticate', async (request: FastifyRequest) => {
      const cabecalho = request.headers.authorization
      if (!cabecalho?.startsWith('Bearer ')) {
        throw app.httpErrors.unauthorized('Token de acesso ausente.')
      }

      let payload: JWTPayload
      try {
        ;({ payload } = await verificar(cabecalho.slice('Bearer '.length).trim()))
      } catch {
        throw app.httpErrors.unauthorized('Token de acesso inválido ou expirado.')
      }

      if (!payload.sub) {
        throw app.httpErrors.unauthorized('Token de acesso sem usuário.')
      }

      request.usuario = {
        id: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : null,
      }
    })
  },
  { name: 'auth', dependencies: ['@fastify/sensible'] },
)

/** Usuário da requisição. Use só em rotas protegidas por `app.authenticate`. */
export function usuarioDaRequisicao(request: FastifyRequest): UsuarioToken {
  if (!request.usuario) throw new Error('Rota sem app.authenticate no onRequest.')
  return request.usuario
}
