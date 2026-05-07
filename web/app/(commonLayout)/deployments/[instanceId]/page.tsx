import { redirect } from '@/next/navigation'

type PageProps = {
  params: Promise<{ instanceId: string }>
}

export default async function InstanceDetailPage({ params }: PageProps) {
  const { instanceId } = await params
  redirect(`/deployments/${instanceId}/overview`)
}
