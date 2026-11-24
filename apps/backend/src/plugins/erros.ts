import { STATUS_CODES } from 'node:http'
import type { FastifyInstance } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'

interface ErroPostgres {
  code: string
  message: string
}

/** Erro do Postgres, direto (postgres.js) ou embrulhado pelo Drizzle em `cause`. */
export function erroDoPostgres(erro: unknown): ErroPostgres | null {
  for (let atual: unknown = erro, i = 0; atual && i < 3; i++) {
    if (
      typeof atual === 'object' &&
      'code' in atual &&
      typeof atual.code === 'string' &&
      /^[0-9A-Z]{5}$/.test(atual.code) &&
      atual instanceof Error
    ) {
      return { code: atual.code, message: atual.message }
    }
    atual = typeof atual === 'object' && 'cause' in atual ? atual.cause : null
  }
  return null
}

/** Erros sempre no formato `{ statusCode, error, message }`, com mensagem em português. */
export function registrarTratamentoDeErros(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Rota ${request.method} ${request.url} não encontrada.`,
    })
  })

  app.setErrorHandler((erro, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(erro)) {
      const detalhes = erro.validation
        .map((v) => `${v.instancePath || '/'}: ${v.message ?? 'inválido'}`)
        .join('; ')
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: `Dados inválidos (${detalhes}).`,
      })
    }

    // Regras do banco (gatilhos) usam SQLSTATE P0001 com mensagem em português
    const pg = erroDoPostgres(erro)
    if (pg?.code === 'P0001') {
      return reply.status(422).send({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: pg.message,
      })
    }
    if (pg?.code === '23505') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Já existe um registro com esses dados.',
      })
    }

    const statusCode =
      typeof erro === 'object' && erro !== null && 'statusCode' in erro
        ? Number(erro.statusCode)
        : 500

    // 4xx e 503 (serviço indisponível) são erros previstos: a mensagem vai para o cliente
    if ((statusCode >= 400 && statusCode < 500) || statusCode === 503) {
      const mensagem = erro instanceof Error ? erro.message : 'Requisição inválida.'
      return reply.status(statusCode).send({
        statusCode,
        error: STATUS_CODES[statusCode] ?? 'Error',
        message: mensagem,
      })
    }

    request.log.error(erro)
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Erro interno no servidor. Tente novamente.',
    })
  })
}
