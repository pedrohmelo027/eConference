import { LoaderCircle } from 'lucide-react'

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div
      className="flex flex-1 items-center justify-center gap-2 text-muted-foreground"
      role="status"
    >
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      <span>{texto}</span>
    </div>
  )
}
