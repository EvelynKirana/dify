import SettingsTab from '@/features/deployments/detail/settings-tab'

type PageProps = {
  params: Promise<{ instanceId: string }>
}

const InstanceDetailSettingsPage = async ({ params }: PageProps) => {
  const { instanceId } = await params
  return <SettingsTab instanceId={instanceId} />
}

export default InstanceDetailSettingsPage
