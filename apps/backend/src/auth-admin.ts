// Admin API do Supabase Auth (criar usuário, definir senha, bloquear). Usa a chave secreta.
import { httpErrors } from '@fastify/sensible'

export interface ServicoAuthAdmin {
  /** Cria o usuário já confirmado, com a senha provisória. Devolve o id (= perfis.id). */
  criarUsuario(dados: { email: string; senha: string; nome: string }): Promise<{ id: string }>
  definirSenha(id: string, senha: string): Promise<void>
  /** Bloqueia (ou desbloqueia) o login no Supabase Auth. */
  bloquear(id: string, bloqueado: boolean): Promise<void>
  excluir(id: string): Promise<void>
}

interface ErroAuth {
  error_code?: string
  code?: string | number
  msg?: string
  message?: string
}

/** Bloqueio "permanente" (100 anos): o Supabase não tem bloqueio sem prazo. */
const BLOQUEIO = '876000h'

export function criarServicoAuthAdmin(supabaseUrl: string, chaveSecreta: string): ServicoAuthAdmin {
  const base = `${supabaseUrl}/auth/v1/admin/users`

  async function chamar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
    let resposta: Response
    try {
      resposta = await fetch(`${base}${caminho}`, {
        method: metodo,
        headers: {
          apikey: chaveSecreta,
          Authorization: `Bearer ${chaveSecreta}`,
          'Content-Type': 'application/json',
        },
        body: corpo === undefined ? null : JSON.stringify(corpo),
        signal: AbortSignal.timeout(10_000),
      })
    } catch {
      throw httpErrors.serviceUnavailable('Não foi possível falar com o Supabase Auth.')
    }
    const dados = (await resposta.json().catch(() => ({}))) as T & ErroAuth
    if (resposta.ok) return dados

    const codigo = dados.error_code ?? (typeof dados.code === 'string' ? dados.code : '')
    if (codigo === 'email_exists' || codigo === 'user_already_exists') {
      throw httpErrors.conflict('Já existe um usuário com este e-mail.')
    }
    if (codigo === 'weak_password') {
      throw httpErrors.unprocessableEntity('Senha provisória fraca. Use pelo menos 6 caracteres.')
    }
    if (resposta.status === 404)
      throw httpErrors.notFound('Usuário não encontrado no Supabase Auth.')
    if (resposta.status === 401 || resposta.status === 403) {
      throw httpErrors.serviceUnavailable(
        'Chave secreta do Supabase inválida (SUPABASE_SECRET_KEY).',
      )
    }
    throw httpErrors.badGateway(`Supabase Auth recusou a operação (${resposta.status}).`)
  }

  return {
    async criarUsuario({ email, senha, nome }) {
      const usuario = await chamar<{ id: string }>('POST', '', {
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome },
      })
      return { id: usuario.id }
    },
    async definirSenha(id, senha) {
      await chamar('PUT', `/${id}`, { password: senha })
    },
    async bloquear(id, bloqueado) {
      await chamar('PUT', `/${id}`, { ban_duration: bloqueado ? BLOQUEIO : 'none' })
    },
    async excluir(id) {
      await chamar('DELETE', `/${id}`)
    },
  }
}
