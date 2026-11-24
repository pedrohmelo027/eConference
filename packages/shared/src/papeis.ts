import { z } from 'zod'

/** Papéis de usuário. Cada usuário tem exatamente um (README, "Usuários e papéis"). */
export const PAPEIS = ['admin', 'engenharia', 'producao', 'pcp'] as const

export const PapelSchema = z.enum(PAPEIS)
export type Papel = z.infer<typeof PapelSchema>

export const NOMES_PAPEIS: Record<Papel, string> = {
  admin: 'Administrador',
  engenharia: 'Engenharia',
  producao: 'Produção',
  pcp: 'PCP',
}

/** Tela inicial de cada papel depois do login (UC01). */
export const TELA_INICIAL: Record<Papel, string> = {
  admin: '/painel',
  engenharia: '/solicitacoes',
  producao: '/conferencia',
  pcp: '/painel',
}
