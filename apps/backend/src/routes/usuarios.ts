import {
  AtualizarUsuarioSchema,
  CriarUsuarioSchema,
  ErroSchema,
  IdParamSchema,
  ListaUsuariosSchema,
  RedefinirSenhaSchema,
  UsuarioSchema,
} from '@econference/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { usuarioDaRequisicao } from '../plugins/auth.js'
import type { ServicoUsuarios } from '../usuarios.js'

const erros = { 400: ErroSchema, 401: ErroSchema, 403: ErroSchema, 503: ErroSchema }

/** UC02 — Gerenciar usuários e papéis. Só administrador. */
export const usuariosRoutes: FastifyPluginAsyncZod<{ servico: ServicoUsuarios | null }> = async (
  app,
  { servico },
) => {
  const exigirServico = () => {
    if (!servico) {
      throw app.httpErrors.serviceUnavailable(
        'Gestão de usuários indisponível: configure DATABASE_URL e SUPABASE_SECRET_KEY na API.',
      )
    }
    return servico
  }
  const onRequest = [app.authenticate, app.exigirPapel('admin')]
  const security = [{ bearerAuth: [] }]

  app.get(
    '/usuarios',
    {
      onRequest,
      schema: {
        tags: ['usuarios'],
        summary: 'Lista os usuários',
        security,
        response: { 200: ListaUsuariosSchema, ...erros },
      },
    },
    async () => exigirServico().listar(),
  )

  app.post(
    '/usuarios',
    {
      onRequest,
      schema: {
        tags: ['usuarios'],
        summary: 'Cria um usuário com senha provisória',
        security,
        body: CriarUsuarioSchema,
        response: { 201: UsuarioSchema, 409: ErroSchema, ...erros },
      },
    },
    async (request, reply) => {
      const usuario = await exigirServico().criar(usuarioDaRequisicao(request).id, request.body)
      return reply.status(201).send(usuario)
    },
  )

  app.patch(
    '/usuarios/:id',
    {
      onRequest,
      schema: {
        tags: ['usuarios'],
        summary: 'Altera nome, papel ou situação (ativo/desativado)',
        security,
        params: IdParamSchema,
        body: AtualizarUsuarioSchema,
        response: { 200: UsuarioSchema, 404: ErroSchema, 422: ErroSchema, ...erros },
      },
    },
    async (request) =>
      exigirServico().atualizar(usuarioDaRequisicao(request).id, request.params.id, request.body),
  )

  app.post(
    '/usuarios/:id/redefinir-senha',
    {
      onRequest,
      schema: {
        tags: ['usuarios'],
        summary: 'Define nova senha provisória (o usuário troca no próximo acesso)',
        security,
        params: IdParamSchema,
        body: RedefinirSenhaSchema,
        response: { 200: UsuarioSchema, 404: ErroSchema, ...erros },
      },
    },
    async (request) =>
      exigirServico().redefinirSenha(
        usuarioDaRequisicao(request).id,
        request.params.id,
        request.body.senhaProvisoria,
      ),
  )
}
