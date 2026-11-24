'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { Aviso } from '@/components/aviso'
import { Campo } from '@/components/campo'
import { StatusApi } from '@/components/status-api'
import { TelaAuth } from '@/components/tela-auth'
import { Button } from '@/components/ui/button'
import { destinoDoUsuario, useMe } from '@/hooks/use-me'
import { useSessao } from '@/hooks/use-sessao'
import { supabase, traduzirErroAuth } from '@/lib/supabase'

/** UC01 — Entrar no sistema. */
export default function Entrar() {
  const router = useRouter()
  const { sessao } = useSessao()
  const me = useMe()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  // Já logado (ou acabou de entrar): segue para a tela do papel ou para o primeiro acesso
  useEffect(() => {
    if (me.data) router.replace(destinoDoUsuario(me.data))
  }, [me.data, router])

  // Login ok no Supabase, mas sem acesso ao eConference (sem perfil, desativado): sai de novo
  useEffect(() => {
    if (sessao && me.isError) void supabase().auth.signOut()
  }, [sessao, me.isError])

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro(undefined)
    if (!email.trim() || !senha) {
      setErro('Informe e-mail e senha.')
      return
    }
    setEnviando(true)
    const { error } = await supabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    })
    setEnviando(false)
    if (error) setErro(traduzirErroAuth(error))
  }

  const mensagem = erro ?? (me.isError ? me.error.message : undefined)
  const aguardando = enviando || (Boolean(sessao) && me.isPending)

  return (
    <TelaAuth
      titulo="Entrar"
      descricao="Use o e-mail e a senha que o administrador cadastrou."
      rodape={<StatusApi compacto />}
    >
      <form onSubmit={enviar} className="grid gap-4" noValidate>
        <Campo
          id="email"
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Campo
          id="senha"
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        {mensagem && <Aviso tipo="erro">{mensagem}</Aviso>}
        <Button type="submit" className="h-11 text-base" disabled={aguardando}>
          {aguardando ? 'Entrando…' : 'Entrar'}
        </Button>
        <Link
          href="/esqueci-senha"
          className="justify-self-center py-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </Link>
      </form>
    </TelaAuth>
  )
}
