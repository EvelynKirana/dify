import { SettingsTab } from '@/features/deployments/detail/settings-tab'

type PageProps = {
  params: Promise<{ instanceId: string }>
}

export default async function InstanceDetailSettingsPage({ params }: PageProps) {
  const { instanceId } = await params
  return <SettingsTab instanceId={instanceId} />
}
