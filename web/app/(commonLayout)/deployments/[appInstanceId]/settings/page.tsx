import { SettingsTab } from '@/features/deployments/detail/settings-tab'

export default async function InstanceDetailSettingsPage({ params }: {
  params: Promise<{ appInstanceId: string }>
}) {
  const { appInstanceId } = await params
  return <SettingsTab appInstanceId={appInstanceId} />
}
