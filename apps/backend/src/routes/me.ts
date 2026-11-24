import { ErroSchema, MeResponseSchema } from '@econference/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/me',
    {
      // Sem exigirPapel: o usuário com troca de senha pendente precisa ler o próprio /me.
      onRequest: [app.authenticate],
      schema: {
        tags: ['usuarios'],
        summary: 'Usuário logado (perfil, papel e se precisa trocar a senha)',
        security: [{ bearerAuth: [] }],
        response: { 200: MeResponseSchema, 401: ErroSchema, 403: ErroSchema },
      },
    },
    async (request) => {
      const { id, email, nome, papel, trocaSenhaPendente } = await app.carregarPerfil(request)
      return { id, email, nome, papel, trocaSenhaPendente }
    },
  )
}
