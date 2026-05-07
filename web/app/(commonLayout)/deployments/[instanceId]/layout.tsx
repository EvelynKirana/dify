import type { ReactNode } from 'react'
import { InstanceDetail } from '@/features/deployments/detail'

type LayoutProps = {
  children: ReactNode
  params: Promise<{ instanceId: string }>
}

export default async function InstanceDetailLayout({ children, params }: LayoutProps) {
  const { instanceId } = await params

  return (
    <InstanceDetail instanceId={instanceId}>
      {children}
    </InstanceDetail>
  )
}
