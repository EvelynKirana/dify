import { SettingsTab } from '@/features/deployments/detail/settings-tab'

export default async function InstanceDetailSettingsPage({ params }: {
  params: Promise<{ instanceId: string }>
}) {
  const { instanceId } = await params
  return <SettingsTab instanceId={instanceId} />
}
