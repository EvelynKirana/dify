import { OverviewTab } from '@/features/deployments/detail/overview-tab'

export default async function InstanceDetailOverviewPage({ params }: {
  params: Promise<{ instanceId: string }>
}) {
  const { instanceId } = await params
  return <OverviewTab instanceId={instanceId} />
}
