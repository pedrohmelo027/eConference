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
import { criarServicoAuthAdmin, type ServicoAuthAdmin } from './auth-admin.js'
import type { RepositorioPerfis } from './perfis.js'
import { acessoPlugin } from './plugins/acesso.js'
import { authPlugin } from './plugins/auth.js'
import { dbPlugin, type Db } from './plugins/db.js'
import { registrarTratamentoDeErros } from './plugins/erros.js'
import { healthRoutes } from './routes/health.js'
import { meRoutes } from './routes/me.js'
import { usuariosRoutes } from './routes/usuarios.js'
import {
  criarRepositorioUsuarios,
  criarServicoUsuarios,
  type RepositorioUsuarios,
} from './usuarios.js'
import { VERSAO_API } from './versao.js'

export interface OpcoesApp {
  env: Env
  logger?: boolean
  /** Para testes: injeta um banco (ou `null` para nenhum). Padrão: conecta em DATABASE_URL. */
  db?: Db | null
  /** Para testes: perfis em memória. Padrão: tabela `perfis` do banco. */
  perfis?: RepositorioPerfis
  /** Para testes: usuários em memória. Padrão: tabela `perfis` do banco. */
  usuarios?: RepositorioUsuarios
  /** Para testes: Admin API falsa. Padrão: Supabase Auth com SUPABASE_SECRET_KEY. */
  authAdmin?: ServicoAuthAdmin
}

/** Monta a aplicação (plugins + rotas). Usado pelo server.ts e pelos testes. */
export async function buildApp(opcoes: OpcoesApp) {
  const { env, logger = false, db, perfis } = opcoes
  const app = Fastify({ logger }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  registrarTratamentoDeErros(app)

  await app.register(sensible)
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    // O padrão do @fastify/cors é só GET/HEAD/POST: sem isto o navegador barra PATCH/DELETE
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
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
  await app.register(acessoPlugin, { perfis })

  await app.register(healthRoutes)
  await app.register(meRoutes)

  const repoUsuarios = opcoes.usuarios ?? (app.db ? criarRepositorioUsuarios(app.db) : null)
  const authAdmin =
    opcoes.authAdmin ??
    (env.SUPABASE_SECRET_KEY
      ? criarServicoAuthAdmin(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY)
      : null)
  await app.register(usuariosRoutes, {
    servico: repoUsuarios && authAdmin ? criarServicoUsuarios(repoUsuarios, authAdmin) : null,
  })

  app.get('/openapi.json', { schema: { hide: true } }, async () => app.swagger())

  return app
}
