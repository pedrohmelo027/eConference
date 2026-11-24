import { CircleAlert, CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function Aviso({ tipo, children }: { tipo: 'erro' | 'sucesso'; children: ReactNode }) {
  return (
    <Alert
      variant={tipo === 'erro' ? 'destructive' : 'default'}
      role={tipo === 'erro' ? 'alert' : 'status'}
    >
      {tipo === 'erro' ? <CircleAlert /> : <CircleCheck />}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
