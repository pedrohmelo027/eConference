import type { ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Campo de formulário com rótulo e erro, com altura de toque ≥ 44 px. */
export function Campo({
  id,
  rotulo,
  erro,
  ...props
}: ComponentProps<'input'> & { id: string; rotulo: string; erro?: string | undefined }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input
        id={id}
        className="h-11 text-base"
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        {...props}
      />
      {erro && (
        <p id={`${id}-erro`} className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </div>
  )
}
