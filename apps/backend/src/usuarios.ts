// UC02 — Gerenciar usuários e papéis: acesso a dados e regras.
import { httpErrors } from '@fastify/sensible'
import type { AtualizarUsuario, CriarUsuario, Usuario } from '@econference/shared'
import { and, asc, count, eq, ne, sql } from 'drizzle-orm'
import type { ServicoAuthAdmin } from './auth-admin.js'
import { perfis } from './db/schema.js'
import { emNomeDe, type Db } from './plugins/db.js'

export interface RepositorioUsuarios {
  listar(): Promise<Usuario[]>
  buscar(id: string): Promise<Usuario | null>
  buscarPorEmail(email: string): Promise<Usuario | null>
  /** Admins ativos, sem contar `excetoId`. */
  contarAdminsAtivos(excetoId: string): Promise<number>
  /** Cria o perfil e marca a senha atual do Auth como provisória (uma transação). */
  criar(
    ator: string,
    dados: { id: string; nome: string; email: string; papel: Usuario['papel'] },
  ): Promise<void>
  atualizar(ator: string, id: string, campos: AtualizarUsuario): Promise<void>
  registrarSenhaProvisoria(ator: string, id: string): Promise<void>
}

const colunas = {
  id: perfis.id,
  nome: perfis.nome,
  email: perfis.email,
  papel: perfis.papel,
  ativo: perfis.ativo,
  trocaSenhaPendente: sql<boolean>`public.troca_senha_pendente(${perfis.id})`,
  criadoEm: perfis.criadoEm,
}

export function criarRepositorioUsuarios(db: Db): RepositorioUsuarios {
  return {
    listar: () => db.select(colunas).from(perfis).orderBy(asc(perfis.nome)),
    async buscar(id) {
      const [u] = await db.select(colunas).from(perfis).where(eq(perfis.id, id))
      return u ?? null
    },
    async buscarPorEmail(email) {
      const [u] = await db
        .select(colunas)
        .from(perfis)
        .where(sql`lower(btrim(${perfis.email})) = ${email.trim().toLowerCase()}`)
      return u ?? null
    },
    async contarAdminsAtivos(excetoId) {
      const [r] = await db
        .select({ total: count() })
        .from(perfis)
        .where(and(eq(perfis.papel, 'admin'), eq(perfis.ativo, true), ne(perfis.id, excetoId)))
      return r?.total ?? 0
    },
    criar: (ator, dados) =>
      emNomeDe(db, ator, async (tx) => {
        await tx.insert(perfis).values(dados)
        await tx.execute(sql`select public.registrar_senha_provisoria(${dados.id})`)
      }),
    atualizar: (ator, id, campos) =>
      emNomeDe(db, ator, async (tx) => {
        await tx.update(perfis).set(campos).where(eq(perfis.id, id))
      }),
    registrarSenhaProvisoria: (ator, id) =>
      emNomeDe(db, ator, async (tx) => {
        await tx.execute(sql`select public.registrar_senha_provisoria(${id})`)
      }),
  }
}

/** Regras do UC02. `ator` é o id do admin logado. */
export function criarServicoUsuarios(repo: RepositorioUsuarios, auth: ServicoAuthAdmin) {
  async function buscarOu404(id: string) {
    const usuario = await repo.buscar(id)
    if (!usuario) throw httpErrors.notFound('Usuário não encontrado.')
    return usuario
  }

  return {
    listar: () => repo.listar(),

    async criar(ator: string, dados: CriarUsuario): Promise<Usuario> {
      if (await repo.buscarPorEmail(dados.email)) {
        throw httpErrors.conflict('Já existe um usuário com este e-mail.')
      }
      const { id } = await auth.criarUsuario({
        email: dados.email,
        senha: dados.senhaProvisoria,
        nome: dados.nome,
      })
      try {
        await repo.criar(ator, { id, nome: dados.nome, email: dados.email, papel: dados.papel })
      } catch (erro) {
        // Sem perfil o usuário não entra; desfaz no Auth para não deixar login órfão
        await auth.excluir(id).catch(() => undefined)
        throw erro
      }
      return buscarOu404(id)
    },

    async atualizar(ator: string, id: string, campos: AtualizarUsuario): Promise<Usuario> {
      const alvo = await buscarOu404(id)

      if (id === ator && campos.ativo === false) {
        throw httpErrors.unprocessableEntity('Você não pode desativar o próprio usuário.')
      }
      if (id === ator && campos.papel !== undefined && campos.papel !== 'admin') {
        throw httpErrors.unprocessableEntity(
          'Você não pode tirar o seu próprio papel de administrador.',
        )
      }
      const deixaDeSerAdminAtivo =
        alvo.papel === 'admin' &&
        alvo.ativo &&
        (campos.ativo === false || (campos.papel !== undefined && campos.papel !== 'admin'))
      if (deixaDeSerAdminAtivo && (await repo.contarAdminsAtivos(id)) === 0) {
        throw httpErrors.unprocessableEntity(
          'O sistema precisa de pelo menos um administrador ativo.',
        )
      }

      const mudaSituacao = campos.ativo !== undefined && campos.ativo !== alvo.ativo
      if (mudaSituacao) await auth.bloquear(id, !campos.ativo)
      try {
        await repo.atualizar(ator, id, campos)
      } catch (erro) {
        if (mudaSituacao) await auth.bloquear(id, alvo.ativo === false).catch(() => undefined)
        throw erro
      }
      return buscarOu404(id)
    },

    async redefinirSenha(ator: string, id: string, senhaProvisoria: string): Promise<Usuario> {
      await buscarOu404(id)
      await auth.definirSenha(id, senhaProvisoria)
      await repo.registrarSenhaProvisoria(ator, id)
      return buscarOu404(id)
    },
  }
}

export type ServicoUsuarios = ReturnType<typeof criarServicoUsuarios>
