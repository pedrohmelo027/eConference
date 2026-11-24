import { ErroSchema, MeResponseSchema } from '@econference/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { usuarioDaRequisicao } from '../plugins/auth.js'

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['usuarios'],
        summary: 'Usuário do token',
        security: [{ bearerAuth: [] }],
        response: { 200: MeResponseSchema, 401: ErroSchema },
      },
    },
    async (request) => usuarioDaRequisicao(request),
  )
}
