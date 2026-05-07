import type { ReactNode } from 'react'
import { InstanceDetail } from '@/features/deployments/detail'

export default async function InstanceDetailLayout({ children, params }: {
  children: ReactNode
  params: Promise<{ instanceId: string }>
}) {
  const { instanceId } = await params

  return (
    <InstanceDetail instanceId={instanceId}>
      {children}
    </InstanceDetail>
  )
}
