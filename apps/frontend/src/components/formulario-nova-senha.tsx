'use client'

import { NovaSenhaSchema } from '@econference/shared'
import { useState, type FormEvent } from 'react'
import { Aviso } from '@/components/aviso'
import { Campo } from '@/components/campo'
import { Button } from '@/components/ui/button'
import { supabase, traduzirErroAuth } from '@/lib/supabase'

/** Define a nova senha do usuário logado (primeiro acesso e redefinição por e-mail). */
export function FormularioNovaSenha({
  textoBotao,
  aoConcluir,
}: {
  textoBotao: string
  aoConcluir: () => Promise<void> | void
}) {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erroSenha, setErroSenha] = useState<string>()
  const [erroConfirmacao, setErroConfirmacao] = useState<string>()
  const [erro, setErro] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro(undefined)

    const validacao = NovaSenhaSchema.safeParse(senha)
    setErroSenha(validacao.success ? undefined : validacao.error.issues[0]?.message)
    setErroConfirmacao(senha === confirmacao ? undefined : 'As senhas não conferem.')
    if (!validacao.success || senha !== confirmacao) return

    setEnviando(true)
    const { error } = await supabase().auth.updateUser({ password: senha })
    if (error) {
      setErro(traduzirErroAuth(error))
      setEnviando(false)
      return
    }
    await aoConcluir()
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <Campo
        id="nova-senha"
        rotulo="Nova senha"
        type="password"
        autoComplete="new-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        erro={erroSenha}
        required
      />
      <p className="-mt-2 text-sm text-muted-foreground">
        Pelo menos 8 caracteres, com letras e números.
      </p>
      <Campo
        id="confirmacao"
        rotulo="Repita a nova senha"
        type="password"
        autoComplete="new-password"
        value={confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
        erro={erroConfirmacao}
        required
      />
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Button type="submit" className="h-11 text-base" disabled={enviando}>
        {enviando ? 'Salvando…' : textoBotao}
      </Button>
    </form>
  )
}
