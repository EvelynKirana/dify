'use client'
import type { FC } from 'react'
import type { InstanceDetailTabKey } from '@/features/deployments/detail/tabs'
import * as React from 'react'
import { use } from 'react'
import OverviewTab from '@/features/deployments/detail/overview-tab'
import { useRouter } from '@/next/navigation'

type PageProps = {
  params: Promise<{ instanceId: string }>
}

const InstanceDetailOverviewPage: FC<PageProps> = ({ params }) => {
  const { instanceId } = use(params)
  const router = useRouter()
  const handleSwitchTab = (tab: InstanceDetailTabKey) => {
    router.push(`/deployments/${instanceId}/${tab}`)
  }

  return <OverviewTab instanceId={instanceId} onSwitchTab={handleSwitchTab} />
}

export default InstanceDetailOverviewPage
