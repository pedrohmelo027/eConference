import { z } from 'zod'

/** Usuário identificado pelo token. O papel (tabela `perfis`) entra na Fase 3. */
export const MeResponseSchema = z.object({
  id: z.uuid(),
  email: z.email().nullable(),
})
export type MeResponse = z.infer<typeof MeResponseSchema>
