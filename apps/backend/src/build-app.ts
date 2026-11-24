import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import swagger from '@fastify/swagger'
import Fastify from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import type { Env } from './env.js'
import { authPlugin } from './plugins/auth.js'
import { dbPlugin, type Db } from './plugins/db.js'
import { registrarTratamentoDeErros } from './plugins/erros.js'
import { healthRoutes } from './routes/health.js'
import { meRoutes } from './routes/me.js'
import { VERSAO_API } from './versao.js'

export interface OpcoesApp {
  env: Env
  logger?: boolean
  /** Para testes: injeta um banco (ou `null` para nenhum). Padrão: conecta em DATABASE_URL. */
  db?: Db | null
}

/** Monta a aplicação (plugins + rotas). Usado pelo server.ts e pelos testes. */
export async function buildApp({ env, logger = false, db }: OpcoesApp) {
  const app = Fastify({ logger }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  registrarTratamentoDeErros(app)

  await app.register(sensible)
  await app.register(cors, { origin: env.CORS_ORIGIN })
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'eConference API',
        description: 'Conferência de recebimento — Rotex Máquinas',
        version: VERSAO_API,
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
    transform: jsonSchemaTransform,
  })
  await app.register(authPlugin, { env })
  await app.register(dbPlugin, db === undefined ? { env } : { env, db })

  await app.register(healthRoutes)
  await app.register(meRoutes)

  app.get('/openapi.json', { schema: { hide: true } }, async () => app.swagger())

  return app
}
