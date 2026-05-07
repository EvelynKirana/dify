import { VersionsTab } from '@/features/deployments/detail/versions-tab'

export default async function InstanceDetailVersionsPage({ params }: {
  params: Promise<{ instanceId: string }>
}) {
  const { instanceId } = await params
  return <VersionsTab instanceId={instanceId} />
}
