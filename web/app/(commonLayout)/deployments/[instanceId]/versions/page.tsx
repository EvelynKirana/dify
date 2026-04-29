import VersionsTab from '@/features/deployments/detail/versions-tab'

type PageProps = {
  params: Promise<{ instanceId: string }>
}

const InstanceDetailVersionsPage = async ({ params }: PageProps) => {
  const { instanceId } = await params
  return <VersionsTab instanceId={instanceId} />
}

export default InstanceDetailVersionsPage
