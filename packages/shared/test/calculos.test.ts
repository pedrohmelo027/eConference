import { describe, expect, it } from 'vitest'
import {
  normalizarCodigo,
  percentualItem,
  resumir,
  saldoItem,
  statusItem,
  statusSolicitacao,
} from '../src/calculos.js'

const item = (solicitado: number, recebido: number, peso = 1, cancelado = false) => ({
  solicitado,
  recebido,
  peso,
  cancelado,
})

describe('item', () => {
  it('status conforme o recebido (RN04)', () => {
    expect(statusItem(item(4, 0))).toBe('pendente')
    expect(statusItem(item(4, 3))).toBe('parcial')
    expect(statusItem(item(4, 4))).toBe('completo')
    expect(statusItem(item(4, 4, 1, true))).toBe('cancelado')
  })

  it('saldo e percentual (RN06)', () => {
    expect(saldoItem(item(4, 3))).toBe(1)
    expect(saldoItem(item(4, 1, 1, true))).toBe(0)
    expect(percentualItem(item(4, 3))).toBe(0.75)
    expect(percentualItem(item(3, 1))).toBe(0.3333)
  })
})

describe('resumir', () => {
  it('soma peças e ignora cancelados', () => {
    const r = resumir([item(4, 4, 5), item(10, 0, 1, true), item(6, 3, 1)])
    expect(r).toMatchObject({
      itens: 2,
      itensCompletos: 1,
      itensComSaldo: 1,
      itensCancelados: 1,
      pecasSolicitadas: 10,
      pecasRecebidas: 7,
      pecasFaltantes: 3,
      percentual: 0.7,
    })
  })

  it('pondera pelo peso do processo (RN07)', () => {
    // Corte Laser (5): 10 de 10 · Comerciais (1): 0 de 100
    const r = resumir([item(10, 10, 5), item(100, 0, 1)])
    expect(r.percentual).toBe(0.0909) // 10 / 110
    expect(r.percentualPonderado).toBe(0.3333) // 50 / 150
  })

  it('sem itens ativos o % é nulo', () => {
    expect(resumir([]).percentual).toBeNull()
    expect(resumir([item(5, 0, 1, true)]).percentualPonderado).toBeNull()
  })
})

describe('solicitação (RN05)', () => {
  it('rascunho, aberta, concluída e cancelada', () => {
    expect(statusSolicitacao({ liberada: false, cancelada: false, itensComSaldo: 3 })).toBe(
      'rascunho',
    )
    expect(statusSolicitacao({ liberada: true, cancelada: false, itensComSaldo: 3 })).toBe('aberta')
    expect(statusSolicitacao({ liberada: true, cancelada: false, itensComSaldo: 0 })).toBe(
      'concluida',
    )
    expect(statusSolicitacao({ liberada: true, cancelada: true, itensComSaldo: 3 })).toBe(
      'cancelada',
    )
  })
})

describe('normalizarCodigo', () => {
  it('igual à coluna codigo_normalizado do banco', () => {
    expect(normalizarCodigo('  et024-ma-001-008 ')).toBe('ET024-MA-001-008')
    expect(normalizarCodigo('Parafuso   sextavado\tM10')).toBe('PARAFUSO SEXTAVADO M10')
  })
})
