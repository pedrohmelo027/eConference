import { z } from 'zod'
import { PapelSchema } from '../papeis.js'

/** Usuário logado: dados do token + perfil (tabela `perfis`). */
export const MeResponseSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  nome: z.string(),
  papel: PapelSchema,
  /** Senha ainda é a provisória: o front leva para /primeiro-acesso e a API bloqueia as demais rotas. */
  trocaSenhaPendente: z.boolean(),
})
export type MeResponse = z.infer<typeof MeResponseSchema>
