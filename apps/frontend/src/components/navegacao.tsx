'use client'

import type { Papel } from '@econference/shared'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/** Telas do sistema e quem vê cada uma (o admin vê todas). */
const TELAS: { href: string; rotulo: string; papeis: Papel[] }[] = [
  { href: '/painel', rotulo: 'Painel', papeis: ['pcp'] },
  { href: '/solicitacoes', rotulo: 'Solicitações', papeis: ['engenharia'] },
  { href: '/conferencia', rotulo: 'Conferência', papeis: ['producao'] },
  { href: '/usuarios', rotulo: 'Usuários', papeis: [] },
]

export function Navegacao({ papel }: { papel: Papel }) {
  const caminho = usePathname()
  const telas = TELAS.filter((t) => papel === 'admin' || t.papeis.includes(papel))
  if (telas.length < 2) return null

  return (
    <nav className="border-b bg-background">
      <ul className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-2">
        {telas.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={caminho.startsWith(t.href) ? 'page' : undefined}
              className={cn(
                'flex h-11 items-center border-b-2 border-transparent px-3 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground',
                caminho.startsWith(t.href) && 'border-foreground font-medium text-foreground',
              )}
            >
              {t.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
