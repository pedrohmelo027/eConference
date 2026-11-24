/** Gera uma senha provisória simples de ditar ao usuário (ex.: Rotex4821). Ele troca no 1º acesso. */
export function gerarSenhaProvisoria(): string {
  const numeros = new Uint32Array(1)
  crypto.getRandomValues(numeros)
  return `Rotex${String((numeros[0] ?? 0) % 10_000).padStart(4, '0')}`
}
