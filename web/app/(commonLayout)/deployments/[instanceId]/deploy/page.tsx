import { DeployTab } from '@/features/deployments/detail/deploy-tab'

export default async function InstanceDetailDeployPage({ params }: {
  params: Promise<{ instanceId: string }>
}) {
  const { instanceId } = await params
  return <DeployTab instanceId={instanceId} />
}
