import { StatusApi } from '@/components/status-api'

export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-4 py-12">
      <header>
        <p className="text-sm font-medium text-zinc-500">Rotex Máquinas</p>
        <h1 className="text-3xl font-semibold tracking-tight">eConference</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">Conferência de recebimento</p>
      </header>
      <StatusApi />
    </main>
  )
}
