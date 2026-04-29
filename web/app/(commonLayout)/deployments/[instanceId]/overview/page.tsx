import OverviewTab from '@/features/deployments/detail/overview-tab'

type PageProps = {
  params: Promise<{ instanceId: string }>
}

const InstanceDetailOverviewPage = async ({ params }: PageProps) => {
  const { instanceId } = await params
  return <OverviewTab instanceId={instanceId} />
}

export default InstanceDetailOverviewPage
