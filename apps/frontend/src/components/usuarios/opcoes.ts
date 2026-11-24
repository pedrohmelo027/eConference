import { NOMES_PAPEIS, PAPEIS } from '@econference/shared'

export const OPCOES_PAPEL = PAPEIS.map((p) => ({ valor: p, rotulo: NOMES_PAPEIS[p] }))
