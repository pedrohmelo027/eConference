import { z } from 'zod'

/** Trata `VAR=` (vazia no .env) como não definida. */
const opcional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional())

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .transform((valor) =>
      valor
        .split(',')
        .map((origem) => origem.trim())
        .filter(Boolean),
    ),
  SUPABASE_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
  SUPABASE_JWT_SECRET: opcional(z.string()),
  /** Pooler do Supabase, porta 6543, usuário econference_api.<ref>. Sem ela a API sobe sem banco. */
  DATABASE_URL: opcional(z.url()),
})

export type Env = z.infer<typeof EnvSchema>

export function lerEnv(fonte: Record<string, string | undefined> = process.env): Env {
  const resultado = EnvSchema.safeParse(fonte)
  if (!resultado.success) {
    throw new Error(`Variáveis de ambiente inválidas:\n${z.prettifyError(resultado.error)}`)
  }
  return resultado.data
}
