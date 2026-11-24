/** URL da API. `NEXT_PUBLIC_*` é embutida no build (veja .env.example). */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333').replace(
  /\/+$/,
  '',
)
