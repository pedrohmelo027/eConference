'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSair } from '@/components/area-logada'
import { Carregando } from '@/components/carregando'
import { FormularioNovaSenha } from '@/components/formulario-nova-senha'
import { TelaAuth } from '@/components/tela-auth'
import { Button } from '@/components/ui/button'
import { destinoDoUsuario, useMe } from '@/hooks/use-me'
import { useSessao } from '@/hooks/use-sessao'

/** UC01 — troca obrigatória da senha provisória no primeiro acesso. */
export default function PrimeiroAcesso() {
  const router = useRouter()
  const sair = useSair()
  const { carregando, sessao } = useSessao()
  const me = useMe()

  useEffect(() => {
    if (!carregando && !sessao) router.replace('/entrar')
    else if (me.data && !me.data.trocaSenhaPendente) router.replace(destinoDoUsuario(me.data))
  }, [carregando, sessao, me.data, router])

  if (!me.data?.trocaSenhaPendente) return <Carregando />

  return (
    <TelaAuth
      titulo={`Olá, ${me.data.nome}`}
      descricao="Este é o seu primeiro acesso. Defina uma senha pessoal para continuar."
      rodape={
        <Button variant="ghost" className="h-11" onClick={sair}>
          Sair
        </Button>
      }
    >
      <FormularioNovaSenha
        textoBotao="Salvar e continuar"
        aoConcluir={async () => {
          // A API confere no banco que a senha deixou de ser a provisória
          const { data } = await me.refetch()
          if (data) router.replace(destinoDoUsuario(data))
        }}
      />
    </TelaAuth>
  )
}
