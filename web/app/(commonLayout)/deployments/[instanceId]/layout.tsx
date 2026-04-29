import type { ReactNode } from 'react'
import InstanceDetail from '@/features/deployments/detail'

type LayoutProps = {
  children: ReactNode
  params: Promise<{ instanceId: string }>
}

const InstanceDetailLayout = async ({ children, params }: LayoutProps) => {
  const { instanceId } = await params

  return (
    <InstanceDetail instanceId={instanceId}>
      {children}
    </InstanceDetail>
  )
}

export default InstanceDetailLayout
