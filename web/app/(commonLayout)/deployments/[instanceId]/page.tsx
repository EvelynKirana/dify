import { redirect } from '@/next/navigation'

export default async function InstanceDetailPage({ params }: {
  params: Promise<{ instanceId: string }>
}) {
  const { instanceId } = await params
  redirect(`/deployments/${instanceId}/overview`)
}
