import { DeployTab } from '@/features/deployments/detail/deploy-tab'

type PageProps = {
  params: Promise<{ instanceId: string }>
}

export default async function InstanceDetailDeployPage({ params }: PageProps) {
  const { instanceId } = await params
  return <DeployTab instanceId={instanceId} />
}
