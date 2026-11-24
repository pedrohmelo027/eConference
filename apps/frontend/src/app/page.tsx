'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Carregando } from '@/components/carregando'
import { destinoDoUsuario, useMe } from '@/hooks/use-me'
import { useSessao } from '@/hooks/use-sessao'

/** Início: manda para o login ou para a tela inicial do papel (UC01). */
export default function Inicio() {
  const router = useRouter()
  const { carregando, sessao } = useSessao()
  const me = useMe()

  useEffect(() => {
    if (carregando) return
    if (!sessao || me.isError) router.replace('/entrar')
    else if (me.data) router.replace(destinoDoUsuario(me.data))
  }, [carregando, sessao, me.data, me.isError, router])

  return <Carregando />
}
