// Regras de cálculo de saldo, status e andamento (RN03–RN07).
// Espelhadas nas views do banco (supabase/migrations/*_views.sql): mudou aqui, mude lá.

export const STATUS_ITEM = ['pendente', 'parcial', 'completo', 'cancelado'] as const
export type StatusItem = (typeof STATUS_ITEM)[number]

export const STATUS_SOLICITACAO = ['rascunho', 'aberta', 'concluida', 'cancelada'] as const
export type StatusSolicitacao = (typeof STATUS_SOLICITACAO)[number]

export interface ItemParaCalculo {
  solicitado: number
  recebido: number
  cancelado: boolean
  /** Peso do processo do item. */
  peso: number
}

/** Mesma normalização da coluna `codigo_normalizado`: maiúsculas, sem espaços extras. */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().replace(/\s+/g, ' ').toUpperCase()
}

/** Arredonda como o banco (`round(x, 4)`). */
function arredondar4(valor: number): number {
  return Math.round(valor * 10_000) / 10_000
}

/** RN04 */
export function statusItem({
  solicitado,
  recebido,
  cancelado,
}: Pick<ItemParaCalculo, 'solicitado' | 'recebido' | 'cancelado'>): StatusItem {
  if (cancelado) return 'cancelado'
  if (recebido <= 0) return 'pendente'
  if (recebido < solicitado) return 'parcial'
  return 'completo'
}

/** Saldo = solicitado − recebido. Item cancelado não tem falta. */
export function saldoItem({
  solicitado,
  recebido,
  cancelado,
}: Pick<ItemParaCalculo, 'solicitado' | 'recebido' | 'cancelado'>): number {
  return cancelado ? 0 : solicitado - recebido
}

/** RN06: recebido ÷ solicitado (0 a 1, 4 casas). */
export function percentualItem({
  solicitado,
  recebido,
}: Pick<ItemParaCalculo, 'solicitado' | 'recebido'>): number {
  return solicitado > 0 ? arredondar4(recebido / solicitado) : 0
}

export interface Resumo {
  itens: number
  itensCompletos: number
  itensComSaldo: number
  itensCancelados: number
  pecasSolicitadas: number
  pecasRecebidas: number
  pecasFaltantes: number
  /** % simples (0 a 1). Nulo sem itens ativos. */
  percentual: number | null
  /** RN07: Σ(recebido × peso) ÷ Σ(solicitado × peso). Nulo sem itens ativos. */
  percentualPonderado: number | null
}

/** Totais de um conjunto de itens, ignorando os cancelados (RN06, RN07). */
export function resumir(itens: readonly ItemParaCalculo[]): Resumo {
  const r: Resumo = {
    itens: 0,
    itensCompletos: 0,
    itensComSaldo: 0,
    itensCancelados: 0,
    pecasSolicitadas: 0,
    pecasRecebidas: 0,
    pecasFaltantes: 0,
    percentual: null,
    percentualPonderado: null,
  }
  let solicitadoPonderado = 0
  let recebidoPonderado = 0

  for (const item of itens) {
    const status = statusItem(item)
    if (status === 'cancelado') {
      r.itensCancelados++
      continue
    }
    r.itens++
    if (status === 'completo') r.itensCompletos++
    else r.itensComSaldo++
    r.pecasSolicitadas += item.solicitado
    r.pecasRecebidas += item.recebido
    r.pecasFaltantes += saldoItem(item)
    solicitadoPonderado += item.solicitado * item.peso
    recebidoPonderado += item.recebido * item.peso
  }

  if (r.pecasSolicitadas > 0) r.percentual = arredondar4(r.pecasRecebidas / r.pecasSolicitadas)
  if (solicitadoPonderado > 0) {
    r.percentualPonderado = arredondar4(recebidoPonderado / solicitadoPonderado)
  }
  return r
}

/** RN05 */
export function statusSolicitacao({
  liberada,
  cancelada,
  itensComSaldo,
}: {
  liberada: boolean
  cancelada: boolean
  itensComSaldo: number
}): StatusSolicitacao {
  if (cancelada) return 'cancelada'
  if (!liberada) return 'rascunho'
  return itensComSaldo > 0 ? 'aberta' : 'concluida'
}
