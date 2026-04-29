import DeployTab from '@/features/deployments/detail/deploy-tab'

type PageProps = {
  params: Promise<{ instanceId: string }>
}

const InstanceDetailDeployPage = async ({ params }: PageProps) => {
  const { instanceId } = await params
  return <DeployTab instanceId={instanceId} />
}

export default InstanceDetailDeployPage
