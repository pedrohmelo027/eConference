import type { Papel } from '@econference/shared'
import type { FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { criarRepositorioPerfis, type PerfilAcesso, type RepositorioPerfis } from '../perfis.js'
import { usuarioDaRequisicao } from './auth.js'

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * Guarda de rota (use depois de `app.authenticate` no `onRequest`):
     * exige perfil ativo, senha já trocada e um dos papéis informados. O admin sempre passa (RN12).
     * Sem papéis: qualquer usuário ativo.
     */
    exigirPapel: (...papeis: Papel[]) => (request: FastifyRequest) => Promise<void>
    /** Perfil do usuário da requisição (403 se não tem perfil ou está desativado). */
    carregarPerfil: (request: FastifyRequest) => Promise<PerfilAcesso>
  }
  interface FastifyRequest {
    perfil: PerfilAcesso | null
  }
}

export const acessoPlugin = fp<{ perfis?: RepositorioPerfis | undefined }>(
  async (app, opcoes) => {
    const repositorio = opcoes.perfis ?? (app.db ? criarRepositorioPerfis(app.db) : null)

    app.decorateRequest('perfil', null)

    app.decorate('carregarPerfil', async (request: FastifyRequest) => {
      if (request.perfil) return request.perfil
      if (!repositorio) throw app.httpErrors.serviceUnavailable('Banco de dados indisponível.')

      const perfil = await repositorio.buscar(usuarioDaRequisicao(request).id)
      if (!perfil) {
        throw app.httpErrors.forbidden(
          'Usuário sem acesso ao eConference. Procure o administrador.',
        )
      }
      if (!perfil.ativo) {
        throw app.httpErrors.forbidden('Usuário desativado. Procure o administrador.')
      }
      request.perfil = perfil
      return perfil
    })

    app.decorate('exigirPapel', (...papeis: Papel[]) => async (request: FastifyRequest) => {
      const perfil = await app.carregarPerfil(request)
      if (perfil.trocaSenhaPendente) {
        throw app.httpErrors.forbidden('Defina uma nova senha antes de continuar.')
      }
      if (papeis.length > 0 && perfil.papel !== 'admin' && !papeis.includes(perfil.papel)) {
        throw app.httpErrors.forbidden('Seu papel não tem permissão para esta ação.')
      }
    })
  },
  { name: 'acesso', dependencies: ['auth', 'db'] },
)
