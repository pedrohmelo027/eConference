'use client'

import {
  ListaUsuariosSchema,
  UsuarioSchema,
  type AtualizarUsuario,
  type CriarUsuario,
} from '@econference/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiEnviar, apiGet } from '@/lib/api'
import { useToken } from '@/hooks/use-token'

const CHAVE = ['usuarios'] as const

export function useUsuarios() {
  const token = useToken()
  return useQuery({
    queryKey: CHAVE,
    enabled: Boolean(token),
    queryFn: ({ signal }) => apiGet('/usuarios', ListaUsuariosSchema, { token, signal }),
  })
}

function useMutacaoUsuario<V, R>(executar: (token: string | undefined, v: V) => Promise<R>) {
  const token = useToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: V) => executar(token, v),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  })
}

export function useCriarUsuario() {
  return useMutacaoUsuario((token, dados: CriarUsuario) =>
    apiEnviar('POST', '/usuarios', UsuarioSchema, dados, { token }),
  )
}

export function useAtualizarUsuario() {
  return useMutacaoUsuario((token, { id, ...campos }: AtualizarUsuario & { id: string }) =>
    apiEnviar('PATCH', `/usuarios/${id}`, UsuarioSchema, campos, { token }),
  )
}

export function useRedefinirSenha() {
  return useMutacaoUsuario(
    (token, { id, senhaProvisoria }: { id: string; senhaProvisoria: string }) =>
      apiEnviar(
        'POST',
        `/usuarios/${id}/redefinir-senha`,
        UsuarioSchema,
        { senhaProvisoria },
        { token },
      ),
  )
}
