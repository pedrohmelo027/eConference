// Variáveis `NEXT_PUBLIC_*` são embutidas no build (veja .env.example).

/** URL da API. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333').replace(
  /\/+$/,
  '',
)

/** Supabase: usado SÓ para login e sessão. Os dados passam sempre pela API. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
