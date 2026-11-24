'use client'

import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface EstadoSessao {
  carregando: boolean
  sessao: Session | null
  /** Último evento do Supabase Auth (ex.: PASSWORD_RECOVERY ao abrir o link de redefinição). */
  evento: AuthChangeEvent | null
}

const SessaoContexto = createContext<EstadoSessao>({ carregando: true, sessao: null, evento: null })

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSessao>({
    carregando: true,
    sessao: null,
    evento: null,
  })

  useEffect(() => {
    const auth = supabase().auth
    auth.getSession().then(({ data }) => {
      setEstado((atual) => ({ ...atual, carregando: false, sessao: data.session }))
    })
    const { data } = auth.onAuthStateChange((evento, sessao) => {
      setEstado({ carregando: false, sessao, evento })
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return <SessaoContexto value={estado}>{children}</SessaoContexto>
}

export function useSessao() {
  return useContext(SessaoContexto)
}
