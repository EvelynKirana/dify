import { AccessTab } from '@/features/deployments/detail/access-tab'

export default async function InstanceDetailAccessPage({ params }: {
  params: Promise<{ instanceId: string }>
}) {
  const { instanceId } = await params
  return <AccessTab instanceId={instanceId} />
}
