import { z } from 'zod'

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  servico: z.literal('econference-api'),
  versao: z.string(),
  horario: z.iso.datetime(),
})
export type HealthResponse = z.infer<typeof HealthResponseSchema>
