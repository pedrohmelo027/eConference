import { STATUS_CODES } from 'node:http'
import type { FastifyInstance } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'

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

    const statusCode =
      typeof erro === 'object' && erro !== null && 'statusCode' in erro
        ? Number(erro.statusCode)
        : 500

    if (statusCode >= 400 && statusCode < 500) {
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
