import type { ComponentProps } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/** Seleção nativa (abre o seletor do celular), no mesmo estilo dos campos. */
export function CampoSelecao({
  id,
  rotulo,
  opcoes,
  className,
  ...props
}: ComponentProps<'select'> & {
  id: string
  rotulo: string
  opcoes: readonly { valor: string; rotulo: string }[]
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <select
        id={id}
        className={cn(
          'h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30',
          className,
        )}
        {...props}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </div>
  )
}
