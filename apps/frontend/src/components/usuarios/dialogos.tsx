'use client'

import {
  CriarUsuarioSchema,
  NOMES_PAPEIS,
  SenhaProvisoriaSchema,
  type Papel,
  type Usuario,
} from '@econference/shared'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Aviso } from '@/components/aviso'
import { Campo } from '@/components/campo'
import { CampoSelecao } from '@/components/campo-selecao'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OPCOES_PAPEL } from './opcoes'
import { gerarSenhaProvisoria } from './senha-provisoria'
import { useAtualizarUsuario, useCriarUsuario, useRedefinirSenha } from './use-usuarios'

interface PropsDialogo {
  aberto: boolean
  aoMudar: (aberto: boolean) => void
}

function Moldura({
  aberto,
  aoMudar,
  titulo,
  descricao,
  children,
}: PropsDialogo & { titulo: string; descricao?: ReactNode; children: ReactNode }) {
  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descricao && <DialogDescription>{descricao}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

/** Campo de senha provisória com botão "Gerar". Visível, para o admin anotar e entregar. */
function CampoSenhaProvisoria({
  valor,
  aoMudar,
  erro,
}: {
  valor: string
  aoMudar: (v: string) => void
  erro?: string | undefined
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-end gap-2">
      <Campo
        id="senha-provisoria"
        rotulo="Senha provisória"
        autoComplete="off"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        erro={erro}
      />
      <Button
        type="button"
        variant="outline"
        className="h-11"
        onClick={() => aoMudar(gerarSenhaProvisoria())}
      >
        Gerar
      </Button>
    </div>
  )
}

function Botoes({
  enviando,
  texto,
  aoCancelar,
}: {
  enviando: boolean
  texto: string
  aoCancelar: () => void
}) {
  return (
    <DialogFooter className="gap-2">
      <Button type="button" variant="outline" className="h-11" onClick={aoCancelar}>
        Cancelar
      </Button>
      <Button type="submit" className="h-11" disabled={enviando}>
        {enviando ? 'Salvando…' : texto}
      </Button>
    </DialogFooter>
  )
}

/** Mensagem exibida depois de criar ou redefinir: a senha a entregar ao usuário. */
export interface Entrega {
  nome: string
  email: string
  senha: string
}

export function DialogoNovoUsuario({
  aberto,
  aoMudar,
  aoCriar,
}: PropsDialogo & { aoCriar: (e: Entrega) => void }) {
  const criar = useCriarUsuario()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState<Papel>('producao')
  const [senha, setSenha] = useState(gerarSenhaProvisoria)
  const [erros, setErros] = useState<Record<string, string>>({})

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const r = CriarUsuarioSchema.safeParse({ nome, email, papel, senhaProvisoria: senha })
    if (!r.success) {
      setErros(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])))
      return
    }
    setErros({})
    const usuario = await criar.mutateAsync(r.data).catch(() => null)
    if (!usuario) return
    aoCriar({ nome: usuario.nome, email: usuario.email, senha: r.data.senhaProvisoria })
    setNome('')
    setEmail('')
    setPapel('producao')
    setSenha(gerarSenhaProvisoria())
    aoMudar(false)
  }

  return (
    <Moldura
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Novo usuário"
      descricao="O usuário entra com a senha provisória e define a própria senha no primeiro acesso."
    >
      <form onSubmit={enviar} className="grid gap-4" noValidate>
        <Campo
          id="nome"
          rotulo="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={erros.nome}
        />
        <Campo
          id="email"
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          erro={erros.email}
        />
        <CampoSelecao
          id="papel"
          rotulo="Papel"
          opcoes={OPCOES_PAPEL}
          value={papel}
          onChange={(e) => setPapel(e.target.value as Papel)}
        />
        <CampoSenhaProvisoria valor={senha} aoMudar={setSenha} erro={erros.senhaProvisoria} />
        {criar.isError && <Aviso tipo="erro">{criar.error.message}</Aviso>}
        <Botoes
          enviando={criar.isPending}
          texto="Criar usuário"
          aoCancelar={() => aoMudar(false)}
        />
      </form>
    </Moldura>
  )
}

export function DialogoEditarUsuario({
  usuario,
  ehVoceMesmo,
  aoMudar,
}: {
  usuario: Usuario | null
  ehVoceMesmo: boolean
  aoMudar: (aberto: boolean) => void
}) {
  const atualizar = useAtualizarUsuario()
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [papel, setPapel] = useState<Papel>(usuario?.papel ?? 'producao')

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!usuario) return
    const ok = await atualizar.mutateAsync({ id: usuario.id, nome, papel }).catch(() => null)
    if (ok) aoMudar(false)
  }

  return (
    <Moldura
      aberto={Boolean(usuario)}
      aoMudar={aoMudar}
      titulo="Editar usuário"
      descricao={usuario?.email}
    >
      <form onSubmit={enviar} className="grid gap-4" noValidate>
        <Campo
          id="editar-nome"
          rotulo="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <CampoSelecao
          id="editar-papel"
          rotulo="Papel"
          opcoes={OPCOES_PAPEL}
          value={papel}
          onChange={(e) => setPapel(e.target.value as Papel)}
          disabled={ehVoceMesmo}
        />
        {ehVoceMesmo && (
          <p className="-mt-2 text-sm text-muted-foreground">
            Você não pode mudar o seu próprio papel.
          </p>
        )}
        {atualizar.isError && <Aviso tipo="erro">{atualizar.error.message}</Aviso>}
        <Botoes enviando={atualizar.isPending} texto="Salvar" aoCancelar={() => aoMudar(false)} />
      </form>
    </Moldura>
  )
}

export function DialogoRedefinirSenha({
  usuario,
  aoMudar,
  aoRedefinir,
}: {
  usuario: Usuario | null
  aoMudar: (aberto: boolean) => void
  aoRedefinir: (e: Entrega) => void
}) {
  const redefinir = useRedefinirSenha()
  const [senha, setSenha] = useState(gerarSenhaProvisoria)
  const [erro, setErro] = useState<string>()

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!usuario) return
    const r = SenhaProvisoriaSchema.safeParse(senha)
    if (!r.success) {
      setErro(r.error.issues[0]?.message)
      return
    }
    setErro(undefined)
    const ok = await redefinir
      .mutateAsync({ id: usuario.id, senhaProvisoria: senha })
      .catch(() => null)
    if (!ok) return
    aoRedefinir({ nome: usuario.nome, email: usuario.email, senha })
    aoMudar(false)
  }

  return (
    <Moldura
      aberto={Boolean(usuario)}
      aoMudar={aoMudar}
      titulo="Redefinir senha"
      descricao={
        usuario && (
          <>
            Nova senha provisória para <strong>{usuario.nome}</strong>. No próximo acesso ele(a)
            terá que definir uma senha pessoal.
          </>
        )
      }
    >
      <form onSubmit={enviar} className="grid gap-4" noValidate>
        <CampoSenhaProvisoria valor={senha} aoMudar={setSenha} erro={erro} />
        {redefinir.isError && <Aviso tipo="erro">{redefinir.error.message}</Aviso>}
        <Botoes
          enviando={redefinir.isPending}
          texto="Redefinir"
          aoCancelar={() => aoMudar(false)}
        />
      </form>
    </Moldura>
  )
}

export function DialogoSituacao({
  usuario,
  aoMudar,
}: {
  usuario: Usuario | null
  aoMudar: (aberto: boolean) => void
}) {
  const atualizar = useAtualizarUsuario()
  const desativar = usuario?.ativo ?? true

  async function confirmar() {
    if (!usuario) return
    const ok = await atualizar
      .mutateAsync({ id: usuario.id, ativo: !usuario.ativo })
      .catch(() => null)
    if (ok) aoMudar(false)
  }

  return (
    <Moldura
      aberto={Boolean(usuario)}
      aoMudar={aoMudar}
      titulo={desativar ? 'Desativar usuário' : 'Reativar usuário'}
      descricao={
        usuario &&
        (desativar
          ? `${usuario.nome} não conseguirá mais entrar. O histórico dele(a) continua no sistema.`
          : `${usuario.nome} volta a entrar com a senha atual, como ${NOMES_PAPEIS[usuario.papel]}.`)
      }
    >
      {atualizar.isError && <Aviso tipo="erro">{atualizar.error.message}</Aviso>}
      <DialogFooter className="gap-2">
        <Button variant="outline" className="h-11" onClick={() => aoMudar(false)}>
          Cancelar
        </Button>
        <Button
          variant={desativar ? 'destructive' : 'default'}
          className="h-11"
          disabled={atualizar.isPending}
          onClick={confirmar}
        >
          {atualizar.isPending ? 'Salvando…' : desativar ? 'Desativar' : 'Reativar'}
        </Button>
      </DialogFooter>
    </Moldura>
  )
}
