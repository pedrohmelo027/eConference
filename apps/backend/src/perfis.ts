import type { Papel } from '@econference/shared'
import { eq, sql } from 'drizzle-orm'
import { perfis } from './db/schema.js'
import type { Db } from './plugins/db.js'

/** Perfil do usuário logado, com a situação da senha (UC01). */
export interface PerfilAcesso {
  id: string
  nome: string
  email: string
  papel: Papel
  ativo: boolean
  /** A senha atual ainda é a provisória (calculado no banco: public.troca_senha_pendente). */
  trocaSenhaPendente: boolean
}

export interface RepositorioPerfis {
  buscar(id: string): Promise<PerfilAcesso | null>
}

export function criarRepositorioPerfis(db: Db): RepositorioPerfis {
  return {
    async buscar(id) {
      const [perfil] = await db
        .select({
          id: perfis.id,
          nome: perfis.nome,
          email: perfis.email,
          papel: perfis.papel,
          ativo: perfis.ativo,
          trocaSenhaPendente: sql<boolean>`public.troca_senha_pendente(${perfis.id})`,
        })
        .from(perfis)
        .where(eq(perfis.id, id))
      return perfil ?? null
    },
  }
}
