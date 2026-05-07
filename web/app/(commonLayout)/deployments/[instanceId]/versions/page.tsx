import { VersionsTab } from '@/features/deployments/detail/versions-tab'

type PageProps = {
  params: Promise<{ instanceId: string }>
}

export default async function InstanceDetailVersionsPage({ params }: PageProps) {
  const { instanceId } = await params
  return <VersionsTab instanceId={instanceId} />
}
