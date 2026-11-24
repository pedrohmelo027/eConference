import { ErroSchema } from '@econference/shared'
import type { z } from 'zod'
import { API_URL } from './env'

export class ErroApi extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'ErroApi'
  }
}

/** Chama a API e valida a resposta com o schema de `@econference/shared`. */
export async function apiGet<T>(
  caminho: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  let resposta: Response
  try {
    resposta = await fetch(`${API_URL}${caminho}`, init)
  } catch {
    throw new ErroApi(0, 'Não foi possível conectar à API.')
  }

  const corpo: unknown = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    const erro = ErroSchema.safeParse(corpo)
    throw new ErroApi(
      resposta.status,
      erro.success ? erro.data.message : `Erro ${resposta.status} na API.`,
    )
  }
  return schema.parse(corpo)
}
