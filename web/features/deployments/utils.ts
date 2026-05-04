import type {
  AccessPermissionKind,
  AppDeploymentSummary,
  AppInfo,
  AppInstanceOverview,
  AppMode,
  ConsoleEnvironmentSummary,
  ConsoleReleaseSummary,
  EnvironmentDeploymentRow,
  EnvironmentOption,
  ListAppDeploymentsReply,
  ListDeploymentEnvironmentOptionsReply,
  RuntimeBindingDisplay,
} from './types'
import { PUBLIC_API_PREFIX } from '@/config'

export type DeploymentUiStatus = 'ready' | 'deploying' | 'deploy_failed'

export const formatDate = (value?: string) => {
  if (!value)
    return '—'
  return value.replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '').slice(0, 16)
}

export const environmentId = (environment?: ConsoleEnvironmentSummary | EnvironmentOption) => environment?.id ?? ''

export const environmentName = (environment?: ConsoleEnvironmentSummary | EnvironmentOption) => environment?.name || environment?.id || '—'

export const environmentMode = (environment?: ConsoleEnvironmentSummary | EnvironmentOption) => {
  const type = environment?.type?.toLowerCase() ?? ''
  return type.includes('isolated') ? 'isolated' : 'shared'
}

export const environmentBackend = (environment?: ConsoleEnvironmentSummary) => {
  const runtime = (environment?.backend || environment?.runtime)?.toLowerCase() ?? ''
  return runtime.includes('host') ? 'host' : 'k8s'
}

export const environmentHealth = (environment?: ConsoleEnvironmentSummary | EnvironmentOption) => {
  const status = environment?.status?.toLowerCase() ?? ''
  return status.includes('ready') ? 'ready' : 'degraded'
}

export const releaseId = (release?: ConsoleReleaseSummary) => release?.id ?? ''

export const releaseLabel = (release?: ConsoleReleaseSummary) => release?.name || release?.displayId || release?.id || '—'

export const releaseCommit = (release?: ConsoleReleaseSummary) => release?.shortCommitId || release?.commitId || '—'

export const runtimeBindingLabel = (binding?: RuntimeBindingDisplay) =>
  binding?.label || binding?.slot || binding?.kind || '—'

export const runtimeBindingValue = (binding?: RuntimeBindingDisplay) =>
  binding?.displayValue || binding?.maskedValue || binding?.displayName || '—'

export const runtimeBindingSummary = (binding?: RuntimeBindingDisplay) =>
  binding?.label || binding?.slot || binding?.displayName || binding?.displayValue || binding?.maskedValue || binding?.kind || '—'

export const isRuntimeEnvVarBinding = (binding?: RuntimeBindingDisplay) =>
  (binding?.kind?.toLowerCase() ?? '').includes('env')

export const isRuntimeModelBinding = (binding?: RuntimeBindingDisplay) =>
  (binding?.kind?.toLowerCase() ?? '').includes('model')

export const isRuntimePluginBinding = (binding?: RuntimeBindingDisplay) =>
  !isRuntimeEnvVarBinding(binding) && !isRuntimeModelBinding(binding)

const absoluteUrlRegExp = /^[a-z][a-z\d+.-]*:\/\//i

const withLeadingSlash = (path: string) => path.startsWith('/') ? path : `/${path}`

const publicWebappOrigin = () => {
  try {
    return new URL(PUBLIC_API_PREFIX).origin
  }
  catch {
    return PUBLIC_API_PREFIX.replace(/\/api\/?$/, '').replace(/\/+$/, '')
  }
}

export const webappUrl = (url?: string) => {
  if (!url)
    return ''
  if (absoluteUrlRegExp.test(url))
    return url

  const origin = publicWebappOrigin()
  return `${origin}${withLeadingSlash(url)}`
}

export const deploymentId = (row?: EnvironmentDeploymentRow) =>
  row?.id || ''

export const activeRelease = (row?: EnvironmentDeploymentRow) => row?.currentRelease

export const isUndeployedDeploymentRow = (row?: EnvironmentDeploymentRow) =>
  (row?.status?.toLowerCase() ?? '').includes('undeployed') || (!row?.id && !row?.currentRelease && !row?.detail)

export const deploymentStatus = (row: EnvironmentDeploymentRow): DeploymentUiStatus => {
  const runtimeStatus = row.status?.toLowerCase() ?? ''
  if (runtimeStatus.includes('deploying') || runtimeStatus.includes('pending'))
    return 'deploying'
  if (runtimeStatus.includes('fail') || runtimeStatus.includes('error'))
    return 'deploy_failed'
  return 'ready'
}

export const deployedRows = (rows?: EnvironmentDeploymentRow[]) =>
  rows?.filter((row) => {
    const runtimeStatus = row.status?.toLowerCase() ?? ''
    return row.environment?.id
      && !isUndeployedDeploymentRow(row)
      && (row.id || runtimeStatus || row.currentRelease || row.detail)
  }) ?? []

export function toAppInfoFromSummary(summary: AppDeploymentSummary): AppInfo | undefined {
  if (!summary.id || !summary.name)
    return undefined

  return {
    id: summary.id,
    name: summary.name,
    mode: (summary.mode || 'workflow') as AppMode,
    iconType: 'emoji',
    icon: summary.icon,
    sourceAppName: summary.sourceAppName,
  }
}

export function toAppInfoFromOverview(instance?: AppInstanceOverview): AppInfo | undefined {
  if (!instance?.id)
    return undefined

  return {
    id: instance.id,
    name: instance.name ?? instance.id,
    mode: (instance.mode || 'workflow') as AppMode,
    iconType: 'emoji',
    description: instance.description ?? undefined,
    sourceAppId: instance.sourceAppId,
    sourceAppName: instance.sourceAppName,
  }
}

export const sourceAppsFromList = (response?: ListAppDeploymentsReply) => {
  return (response?.data ?? [])
    .map(toAppInfoFromSummary)
    .filter((app): app is AppInfo => Boolean(app))
}

export const deploymentSummariesFromList = (response?: ListAppDeploymentsReply): Record<string, AppDeploymentSummary> => {
  return Object.fromEntries(
    (response?.data ?? [])
      .filter(summary => summary.id)
      .map(summary => [summary.id!, summary]),
  )
}

export const environmentOptionsFromOptionsReply = (response?: ListDeploymentEnvironmentOptionsReply): EnvironmentOption[] => {
  return response?.environments
    ?.filter(environment => environment.id)
    .map(environment => ({
      ...environment,
      disabled: environment.deployable === false,
    })) ?? []
}

export const accessModeToPermissionKey = (mode?: string): AccessPermissionKind => {
  const normalized = mode?.toLowerCase() ?? ''
  if (normalized === 'private')
    return 'specific'
  if (normalized === 'public')
    return 'anyone'
  return 'organization'
}

export const permissionKeyToAccessMode = (key: AccessPermissionKind) => {
  if (key === 'organization')
    return 'private_all'
  if (key === 'specific')
    return 'private'
  return 'public'
}
