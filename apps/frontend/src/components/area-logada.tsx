'use client'

import { NOMES_PAPEIS } from '@econference/shared'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { Aviso } from '@/components/aviso'
import { Carregando } from '@/components/carregando'
import { Navegacao } from '@/components/navegacao'
import { Button } from '@/components/ui/button'
import { useMe } from '@/hooks/use-me'
import { useSessao } from '@/hooks/use-sessao'
import { supabase } from '@/lib/supabase'

export function useSair() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return async () => {
    await supabase().auth.signOut()
    queryClient.clear()
    router.replace('/entrar')
  }
}

/**
 * Área que exige login. Sem sessão → /entrar; senha provisória → /primeiro-acesso.
 * É só navegação: quem garante o acesso aos dados é a API (exigirPapel).
 */
export function AreaLogada({ children }: { children: ReactNode }) {
  const router = useRouter()
  const sair = useSair()
  const { carregando, sessao } = useSessao()
  const me = useMe()

  useEffect(() => {
    if (!carregando && !sessao) router.replace('/entrar')
    else if (me.data?.trocaSenhaPendente) router.replace('/primeiro-acesso')
  }, [carregando, sessao, me.data, router])

  if (me.isError) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4">
        <Aviso tipo="erro">{me.error.message}</Aviso>
        <Button variant="outline" className="h-11" onClick={sair}>
          Sair
        </Button>
      </main>
    )
  }

  const pronto = Boolean(me.data && !me.data.trocaSenhaPendente)

  // A página é sempre renderizada (escondida até a sessão ser confirmada) para o Next conseguir
  // validá-la. Não expõe dados: as páginas só consultam a API com token e usam <Restrito>.
  return (
    <>
      {!pronto && <Carregando />}
      <div hidden={!pronto} className="flex flex-1 flex-col">
        {me.data && (
          <>
            <header className="border-b bg-background">
              <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
                <span className="font-semibold">eConference</span>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm text-muted-foreground">
                    {me.data.nome} · {NOMES_PAPEIS[me.data.papel]}
                  </span>
                  <Button variant="ghost" className="h-11 px-3" onClick={sair} aria-label="Sair">
                    <LogOut />
                    <span className="hidden sm:inline">Sair</span>
                  </Button>
                </div>
              </div>
            </header>
            <Navegacao papel={me.data.papel} />
          </>
        )}
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">{children}</div>
      </div>
    </>
  )
}

/** Conteúdo provisório das telas que chegam nas próximas fases. */
export function EmConstrucao({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <section className="grid gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      <p className="text-muted-foreground">{texto}</p>
    </section>
  )
}
