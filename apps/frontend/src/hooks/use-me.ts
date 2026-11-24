'use client'

import { MeResponseSchema, TELA_INICIAL, type MeResponse } from '@econference/shared'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { useSessao } from './use-sessao'

/** Perfil do usuário logado (GET /me). Só consulta quando há sessão. */
export function useMe() {
  const { sessao } = useSessao()
  return useQuery({
    queryKey: ['me', sessao?.user.id],
    enabled: Boolean(sessao),
    retry: false,
    staleTime: 60_000,
    queryFn: ({ signal }) =>
      apiGet('/me', MeResponseSchema, { token: sessao?.access_token, signal }),
  })
}

/** Para onde o usuário vai depois de entrar (UC01). */
export function destinoDoUsuario(me: MeResponse): string {
  return me.trocaSenhaPendente ? '/primeiro-acesso' : TELA_INICIAL[me.papel]
}
