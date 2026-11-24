import { buildApp } from './build-app.js'
import { lerEnv } from './env.js'

// Local: carrega apps/backend/.env, se existir. Na Vercel as variáveis vêm do projeto.
if (process.env.NODE_ENV !== 'production') {
  try {
    process.loadEnvFile()
  } catch {
    // sem .env: segue com as variáveis do ambiente
  }
}

const env = lerEnv()
const app = await buildApp({ env, logger: true })

await app.listen({ port: env.PORT, host: env.HOST })
