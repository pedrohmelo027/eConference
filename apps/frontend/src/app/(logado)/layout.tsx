'use client'

import { AreaLogada } from '@/components/area-logada'

export default function LayoutLogado({ children }: LayoutProps<'/'>) {
  return <AreaLogada>{children}</AreaLogada>
}
