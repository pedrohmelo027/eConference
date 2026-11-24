import { HealthResponseSchema } from '@econference/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { VERSAO_API } from '../versao.js'

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['sistema'],
        summary: 'Verifica se a API está no ar',
        response: { 200: HealthResponseSchema },
      },
    },
    async () => ({
      status: 'ok' as const,
      servico: 'econference-api' as const,
      versao: VERSAO_API,
      horario: new Date().toISOString(),
    }),
  )
}
