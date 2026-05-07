import { OverviewTab } from '@/features/deployments/detail/overview-tab'

type PageProps = {
  params: Promise<{ instanceId: string }>
}

export default async function InstanceDetailOverviewPage({ params }: PageProps) {
  const { instanceId } = await params
  return <OverviewTab instanceId={instanceId} />
}
