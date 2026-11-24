'use client'

import type { Papel } from '@econference/shared'
import type { ReactNode } from 'react'
import { Aviso } from '@/components/aviso'
import { useMe } from '@/hooks/use-me'

/**
 * Mostra o conteúdo só para os papéis informados (o admin sempre vê).
 * É só interface: a API também recusa (exigirPapel).
 */
export function Restrito({ papeis, children }: { papeis: Papel[]; children: ReactNode }) {
  const { data: me } = useMe()
  if (!me) return null
  if (me.papel !== 'admin' && !papeis.includes(me.papel)) {
    return <Aviso tipo="erro">Você não tem acesso a esta tela.</Aviso>
  }
  return children
}
