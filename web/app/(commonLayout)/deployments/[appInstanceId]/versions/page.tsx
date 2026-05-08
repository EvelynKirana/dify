import { VersionsTab } from '@/features/deployments/detail/versions-tab'

export default async function InstanceDetailVersionsPage({ params }: {
  params: Promise<{ appInstanceId: string }>
}) {
  const { appInstanceId } = await params
  return <VersionsTab appInstanceId={appInstanceId} />
}
