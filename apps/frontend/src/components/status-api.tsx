'use client'

import { HealthResponseSchema, type HealthResponse } from '@econference/shared'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { API_URL } from '@/lib/env'
import { cn } from '@/lib/utils'

const ROTULO_BANCO: Record<HealthResponse['banco'], string> = {
  ok: 'conectado',
  indisponivel: 'indisponível',
  nao_configurado: 'não configurado',
}

/** Mostra se a API e o banco estão no ar (GET /health). */
export function StatusApi({ compacto = false }: { compacto?: boolean }) {
  const health = useQuery({
    queryKey: ['health'],
    retry: false,
    queryFn: ({ signal }) => apiGet('/health', HealthResponseSchema, { signal }),
  })

  const cor = health.isError
    ? 'bg-red-500'
    : !health.data
      ? 'bg-zinc-400'
      : health.data.banco === 'ok'
        ? 'bg-green-500'
        : 'bg-amber-500'

  const texto = health.isError
    ? `API fora do ar (${API_URL})`
    : !health.data
      ? 'Verificando a API…'
      : `API ${health.data.versao} · banco ${ROTULO_BANCO[health.data.banco]}`

  return (
    <p
      role="status"
      className={cn(
        'flex items-center justify-center gap-2 text-muted-foreground',
        compacto ? 'text-xs' : 'text-sm',
      )}
    >
      <span className={cn('size-2 shrink-0 rounded-full', cor)} aria-hidden />
      {texto}
    </p>
  )
}
