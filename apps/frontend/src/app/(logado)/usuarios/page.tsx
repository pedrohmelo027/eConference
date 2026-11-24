'use client'

import { NOMES_PAPEIS, type Usuario } from '@econference/shared'
import { KeyRound, Pencil, Plus, Power, X } from 'lucide-react'
import { useState } from 'react'
import { Aviso } from '@/components/aviso'
import { Carregando } from '@/components/carregando'
import { Restrito } from '@/components/restrito'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DialogoEditarUsuario,
  DialogoNovoUsuario,
  DialogoRedefinirSenha,
  DialogoSituacao,
  type Entrega,
} from '@/components/usuarios/dialogos'
import { useUsuarios } from '@/components/usuarios/use-usuarios'
import { useMe } from '@/hooks/use-me'

/** UC02 — Gerenciar usuários e papéis (só administrador). */
export default function PaginaUsuarios() {
  return (
    <Restrito papeis={['admin']}>
      <Usuarios />
    </Restrito>
  )
}

function Usuarios() {
  const { data: me } = useMe()
  const usuarios = useUsuarios()
  const [novo, setNovo] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [redefinindo, setRedefinindo] = useState<Usuario | null>(null)
  const [mudandoSituacao, setMudandoSituacao] = useState<Usuario | null>(null)
  const [entrega, setEntrega] = useState<Entrega | null>(null)

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Quem acessa o eConference e com qual papel.
          </p>
        </div>
        <Button className="h-11" onClick={() => setNovo(true)}>
          <Plus /> Novo usuário
        </Button>
      </div>

      {entrega && (
        <div className="relative">
          <Aviso tipo="sucesso">
            Entregue ao usuário <strong>{entrega.nome}</strong> ({entrega.email}) a senha provisória{' '}
            <strong className="font-mono text-base">{entrega.senha}</strong>. No primeiro acesso
            ele(a) vai definir uma senha pessoal.
          </Aviso>
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-1 right-1"
            aria-label="Fechar aviso"
            onClick={() => setEntrega(null)}
          >
            <X />
          </Button>
        </div>
      )}

      {usuarios.isPending && <Carregando />}
      {usuarios.isError && <Aviso tipo="erro">{usuarios.error.message}</Aviso>}

      {usuarios.data && (
        <ul className="grid gap-3">
          {usuarios.data.map((u) => (
            <li
              key={u.id}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center"
              data-usuario={u.email}
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {u.nome}
                  {u.id === me?.id && <span className="text-xs text-muted-foreground">(você)</span>}
                </p>
                <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{NOMES_PAPEIS[u.papel]}</Badge>
                  {u.ativo ? (
                    <Badge variant="outline">Ativo</Badge>
                  ) : (
                    <Badge variant="destructive">Desativado</Badge>
                  )}
                  {u.ativo && u.trocaSenhaPendente && (
                    <Badge variant="outline">Primeiro acesso pendente</Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="h-11" onClick={() => setEditando(u)}>
                  <Pencil /> Editar
                </Button>
                <Button variant="outline" className="h-11" onClick={() => setRedefinindo(u)}>
                  <KeyRound /> Senha
                </Button>
                {u.id !== me?.id && (
                  <Button variant="outline" className="h-11" onClick={() => setMudandoSituacao(u)}>
                    <Power /> {u.ativo ? 'Desativar' : 'Reativar'}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <DialogoNovoUsuario aberto={novo} aoMudar={setNovo} aoCriar={setEntrega} />
      <DialogoEditarUsuario
        key={`editar-${editando?.id}`}
        usuario={editando}
        ehVoceMesmo={editando?.id === me?.id}
        aoMudar={(aberto) => !aberto && setEditando(null)}
      />
      <DialogoRedefinirSenha
        key={`senha-${redefinindo?.id}`}
        usuario={redefinindo}
        aoMudar={(aberto) => !aberto && setRedefinindo(null)}
        aoRedefinir={setEntrega}
      />
      <DialogoSituacao
        usuario={mudandoSituacao}
        aoMudar={(aberto) => !aberto && setMudandoSituacao(null)}
      />
    </section>
  )
}
