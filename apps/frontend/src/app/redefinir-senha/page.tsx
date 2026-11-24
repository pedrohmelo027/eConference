'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Aviso } from '@/components/aviso'
import { Carregando } from '@/components/carregando'
import { FormularioNovaSenha } from '@/components/formulario-nova-senha'
import { TelaAuth } from '@/components/tela-auth'
import { destinoDoUsuario, useMe } from '@/hooks/use-me'
import { useSessao } from '@/hooks/use-sessao'

/** Destino do link de redefinição enviado por e-mail (o Supabase abre a sessão pela URL). */
export default function RedefinirSenha() {
  const router = useRouter()
  const { carregando, sessao } = useSessao()
  const me = useMe()

  if (carregando) return <Carregando />

  if (!sessao) {
    return (
      <TelaAuth titulo="Link inválido ou expirado">
        <div className="grid gap-4">
          <Aviso tipo="erro">Peça um novo link de redefinição de senha.</Aviso>
          <Link
            href="/esqueci-senha"
            className="text-center text-sm underline-offset-4 hover:underline"
          >
            Pedir novo link
          </Link>
        </div>
      </TelaAuth>
    )
  }

  return (
    <TelaAuth titulo="Nova senha" descricao="Defina a nova senha de acesso ao eConference.">
      <FormularioNovaSenha
        textoBotao="Salvar nova senha"
        aoConcluir={async () => {
          const { data } = await me.refetch()
          router.replace(data ? destinoDoUsuario(data) : '/')
        }}
      />
    </TelaAuth>
  )
}
