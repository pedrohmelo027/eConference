'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { Aviso } from '@/components/aviso'
import { Campo } from '@/components/campo'
import { TelaAuth } from '@/components/tela-auth'
import { Button } from '@/components/ui/button'
import { supabase, traduzirErroAuth } from '@/lib/supabase'

/** UC01 (alternativo) — esqueceu a senha: link de redefinição por e-mail. */
export default function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string>()
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro(undefined)
    if (!email.trim()) {
      setErro('Informe o e-mail.')
      return
    }
    setEnviando(true)
    const { error } = await supabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    setEnviando(false)
    // Não revela se o e-mail existe: a mensagem de sucesso é a mesma
    if (error && error.code?.startsWith('over_')) setErro(traduzirErroAuth(error))
    else setEnviado(true)
  }

  return (
    <TelaAuth
      titulo="Esqueci minha senha"
      descricao="Enviaremos um link para você definir uma nova senha."
      rodape={
        <Link
          href="/entrar"
          className="justify-self-center py-2 text-center text-sm underline-offset-4 hover:underline"
        >
          Voltar para entrar
        </Link>
      }
    >
      {enviado ? (
        <Aviso tipo="sucesso">
          Se o e-mail estiver cadastrado, você vai receber o link em alguns minutos. Confira também
          a caixa de spam.
        </Aviso>
      ) : (
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
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <Button type="submit" className="h-11 text-base" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar link'}
          </Button>
        </form>
      )}
    </TelaAuth>
  )
}
