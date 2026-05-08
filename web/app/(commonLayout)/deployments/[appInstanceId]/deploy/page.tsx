import { DeployTab } from '@/features/deployments/detail/deploy-tab'

export default async function InstanceDetailDeployPage({ params }: {
  params: Promise<{ appInstanceId: string }>
}) {
  const { appInstanceId } = await params
  return <DeployTab appInstanceId={appInstanceId} />
}
