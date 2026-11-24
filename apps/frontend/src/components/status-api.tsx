'use client'

import { HealthResponseSchema, type HealthResponse } from '@econference/shared'
import { useEffect, useState } from 'react'
import { apiGet, ErroApi } from '@/lib/api'
import { API_URL } from '@/lib/env'

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'ok'; dados: HealthResponse }
  | { tipo: 'erro'; mensagem: string }

const ROTULO_BANCO: Record<HealthResponse['banco'], string> = {
  ok: 'conectado',
  indisponivel: 'indisponível',
  nao_configurado: 'não configurado',
}

/** Mostra se a API está no ar (GET /health). */
export function StatusApi() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })

  useEffect(() => {
    const controle = new AbortController()
    apiGet('/health', HealthResponseSchema, { signal: controle.signal })
      .then((dados) => setEstado({ tipo: 'ok', dados }))
      .catch((erro: unknown) => {
        if (controle.signal.aborted) return
        const mensagem = erro instanceof ErroApi ? erro.message : 'Resposta inesperada da API.'
        setEstado({ tipo: 'erro', mensagem })
      })
    return () => controle.abort()
  }, [])

  const cor =
    estado.tipo === 'erro'
      ? 'bg-red-500'
      : estado.tipo === 'carregando'
        ? 'bg-zinc-400'
        : estado.dados.banco === 'ok'
          ? 'bg-green-500'
          : 'bg-amber-500'

  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${cor}`} aria-hidden />
      <div className="min-w-0">
        <p className="font-medium" role="status">
          {estado.tipo === 'carregando' && 'Verificando a API…'}
          {estado.tipo === 'ok' && 'API conectada'}
          {estado.tipo === 'erro' && 'API fora do ar'}
        </p>
        <p className="truncate text-sm text-zinc-500">
          {estado.tipo === 'ok' &&
            `versão ${estado.dados.versao} · banco ${ROTULO_BANCO[estado.dados.banco]} · ${API_URL}`}
          {estado.tipo === 'erro' && `${estado.mensagem} (${API_URL})`}
          {estado.tipo === 'carregando' && API_URL}
        </p>
      </div>
    </div>
  )
}
