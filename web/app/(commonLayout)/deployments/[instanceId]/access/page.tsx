import { AccessTab } from '@/features/deployments/detail/access-tab'

type PageProps = {
  params: Promise<{ instanceId: string }>
}

export default async function InstanceDetailAccessPage({ params }: PageProps) {
  const { instanceId } = await params
  return <AccessTab instanceId={instanceId} />
}
