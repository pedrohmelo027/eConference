import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { cn } from '@/lib/utils'
import { Providers } from './providers'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'eConference',
  description: 'Conferência de recebimento — Rotex Máquinas',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={cn('h-full antialiased', 'font-sans', geist.variable)}>
      <body className="flex min-h-full flex-col bg-muted/40">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
