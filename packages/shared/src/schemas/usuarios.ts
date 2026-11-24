import { z } from 'zod'
import { PapelSchema } from '../papeis.js'

/** Usuário na gestão de usuários (UC02). */
export const UsuarioSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  email: z.string(),
  papel: PapelSchema,
  ativo: z.boolean(),
  /** Ainda não trocou a senha provisória (primeiro acesso pendente). */
  trocaSenhaPendente: z.boolean(),
  criadoEm: z.string(),
})
export type Usuario = z.infer<typeof UsuarioSchema>

export const ListaUsuariosSchema = z.array(UsuarioSchema)

const NomeSchema = z
  .string()
  .trim()
  .min(2, 'Informe o nome (pelo menos 2 letras).')
  .max(120, 'O nome pode ter no máximo 120 caracteres.')

const EmailSchema = z.string().trim().toLowerCase().pipe(z.email('E-mail inválido.'))

/** Senha provisória que o admin define e entrega ao usuário. Ele troca no primeiro acesso. */
export const SenhaProvisoriaSchema = z
  .string()
  .min(6, 'A senha provisória precisa ter pelo menos 6 caracteres.')
  .max(72, 'A senha provisória pode ter no máximo 72 caracteres.')

export const CriarUsuarioSchema = z.object({
  nome: NomeSchema,
  email: EmailSchema,
  papel: PapelSchema,
  senhaProvisoria: SenhaProvisoriaSchema,
})
export type CriarUsuario = z.infer<typeof CriarUsuarioSchema>

export const AtualizarUsuarioSchema = z
  .object({
    nome: NomeSchema.optional(),
    papel: PapelSchema.optional(),
    ativo: z.boolean().optional(),
  })
  .refine((v) => v.nome !== undefined || v.papel !== undefined || v.ativo !== undefined, {
    message: 'Informe o que alterar (nome, papel ou situação).',
  })
export type AtualizarUsuario = z.infer<typeof AtualizarUsuarioSchema>

export const RedefinirSenhaSchema = z.object({
  senhaProvisoria: SenhaProvisoriaSchema,
})
export type RedefinirSenha = z.infer<typeof RedefinirSenhaSchema>

export const IdParamSchema = z.object({ id: z.uuid('Identificador inválido.') })
