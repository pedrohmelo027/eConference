import { z } from 'zod'

/** Formato padrão de erro da API: `{ statusCode, error, message }`, mensagem em português. */
export const ErroSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
})
export type Erro = z.infer<typeof ErroSchema>
