import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** Moldura das telas de acesso (entrar, primeiro acesso, senha). Pensada primeiro para celular. */
export function TelaAuth({
  titulo,
  descricao,
  children,
  rodape,
}: {
  titulo: string
  descricao?: ReactNode
  children: ReactNode
  rodape?: ReactNode
}) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">Rotex Máquinas</p>
        <p className="text-2xl font-semibold tracking-tight">eConference</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{titulo}</CardTitle>
          {descricao && <CardDescription>{descricao}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {rodape}
    </main>
  )
}
