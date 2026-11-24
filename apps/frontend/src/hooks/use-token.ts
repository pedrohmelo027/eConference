'use client'

import { useSessao } from './use-sessao'

/** Access token atual (para chamadas autenticadas à API). */
export function useToken(): string | undefined {
  return useSessao().sessao?.access_token
}
