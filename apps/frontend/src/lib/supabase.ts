import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './env'

let cliente: SupabaseClient | null = null

/**
 * Cliente do Supabase Auth (login, sessão, troca de senha). Criado sob demanda, só no navegador.
 * Não use para ler ou gravar dados: isso é sempre pela API (README, Arquitetura).
 */
export function supabase(): SupabaseClient {
  if (!cliente) {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error(
        'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (.env.local).',
      )
    }
    cliente = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return cliente
}

/** Mensagens do Supabase Auth em português. */
export function traduzirErroAuth(erro: { code?: string | undefined; message: string }): string {
  switch (erro.code) {
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.'
    case 'same_password':
      return 'A nova senha precisa ser diferente da atual.'
    case 'weak_password':
      return 'Senha fraca. Use pelo menos 8 caracteres, com letras e números.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
    case 'user_banned':
      return 'Usuário bloqueado. Procure o administrador.'
    case 'session_not_found':
    case 'refresh_token_not_found':
      return 'Sua sessão expirou. Entre novamente.'
    default:
      return 'Não foi possível concluir. Tente de novo.'
  }
}
