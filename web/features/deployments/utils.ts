import type {
  AccessPermissionKind,
  ConsoleEnvironmentSummary,
  ConsoleReleaseSummary,
  EnvironmentDeploymentRow,
  EnvironmentOption,
  ListDeploymentEnvironmentOptionsReply,
  ReleaseHistoryRow,
  RuntimeBindingDisplay,
} from './types'
import { PUBLIC_API_PREFIX } from '@/config'

export type DeploymentUiStatus = 'ready' | 'deploying' | 'deploy_failed'

export function formatDate(value?: string) {
  if (!value)
    return '—'
  return value.replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '').slice(0, 16)
}

export function environmentId(environment?: ConsoleEnvironmentSummary | EnvironmentOption) {
  return environment?.id ?? ''
}

export function environmentName(environment?: ConsoleEnvironmentSummary | EnvironmentOption) {
  return environment?.name || environment?.id || '—'
}

export function environmentMode(environment?: ConsoleEnvironmentSummary | EnvironmentOption) {
  const type = environment?.type?.toLowerCase() ?? ''
  return type.includes('isolated') ? 'isolated' : 'shared'
}

function environmentRuntimeName(environment?: ConsoleEnvironmentSummary | EnvironmentOption) {
  if (!environment)
    return ''
  if ('backend' in environment && environment.backend)
    return environment.backend
  if ('runtime' in environment && environment.runtime)
    return environment.runtime
  return ''
}

export function environmentBackend(environment?: ConsoleEnvironmentSummary | EnvironmentOption) {
  const runtime = environmentRuntimeName(environment).toLowerCase()
  return runtime.includes('host') ? 'host' : 'k8s'
}

export function environmentHealth(environment?: ConsoleEnvironmentSummary | EnvironmentOption) {
  const status = environment?.status?.toLowerCase() ?? ''
  return status.includes('ready') ? 'ready' : 'degraded'
}

export function releaseLabel(release?: ConsoleReleaseSummary | ReleaseHistoryRow) {
  return release?.name || release?.id || '—'
}

export function releaseCommit(release?: ConsoleReleaseSummary | ReleaseHistoryRow) {
  return release && 'shortCommitId' in release ? release.shortCommitId || '—' : '—'
}

export function runtimeBindingSummary(binding?: RuntimeBindingDisplay) {
  return binding?.label || binding?.displayValue || binding?.kind || '—'
}

export function isRuntimeEnvVarBinding(binding?: RuntimeBindingDisplay) {
  return (binding?.kind?.toLowerCase() ?? '').includes('env')
}

export function isRuntimeModelBinding(binding?: RuntimeBindingDisplay) {
  return (binding?.kind?.toLowerCase() ?? '').includes('model')
}

export function isRuntimePluginBinding(binding?: RuntimeBindingDisplay) {
  return !isRuntimeEnvVarBinding(binding) && !isRuntimeModelBinding(binding)
}

const absoluteUrlRegExp = /^[a-z][a-z\d+.-]*:\/\//i

function withLeadingSlash(path: string) {
  return path.startsWith('/') ? path : `/${path}`
}

function publicWebappOrigin() {
  try {
    return new URL(PUBLIC_API_PREFIX).origin
  }
  catch {
    return PUBLIC_API_PREFIX.replace(/\/api\/?$/, '').replace(/\/+$/, '')
  }
}

export function webappUrl(url?: string) {
  if (!url)
    return ''
  if (absoluteUrlRegExp.test(url))
    return url

  const origin = publicWebappOrigin()
  return `${origin}${withLeadingSlash(url)}`
}

export function deploymentId(row?: EnvironmentDeploymentRow) {
  return row?.id || ''
}

export function activeRelease(row?: EnvironmentDeploymentRow) {
  return row?.currentRelease
}

export function isUndeployedDeploymentRow(row?: EnvironmentDeploymentRow) {
  return (row?.status?.toLowerCase() ?? '').includes('undeployed') || (!row?.id && !row?.currentRelease && !row?.detail)
}

export function deploymentStatus(row: EnvironmentDeploymentRow): DeploymentUiStatus {
  const runtimeStatus = row.status?.toLowerCase() ?? ''
  if (runtimeStatus.includes('deploying') || runtimeStatus.includes('pending'))
    return 'deploying'
  if (runtimeStatus.includes('fail') || runtimeStatus.includes('error'))
    return 'deploy_failed'
  return 'ready'
}

export function deployedRows(rows?: EnvironmentDeploymentRow[]) {
  return rows?.filter((row) => {
    const runtimeStatus = row.status?.toLowerCase() ?? ''
    return row.environment?.id
      && !isUndeployedDeploymentRow(row)
      && (row.id || runtimeStatus || row.currentRelease || row.detail)
  }) ?? []
}

export function environmentOptionsFromOptionsReply(response?: ListDeploymentEnvironmentOptionsReply): EnvironmentOption[] {
  return response?.environments
    ?.filter(environment => environment.id)
    .map(environment => ({
      ...environment,
      disabled: environment.deployable === false,
    })) ?? []
}

export function accessModeToPermissionKey(mode?: string): AccessPermissionKind {
  const normalized = mode?.toLowerCase() ?? ''
  if (normalized === 'private')
    return 'specific'
  if (normalized === 'public')
    return 'anyone'
  return 'organization'
}

export function permissionKeyToAccessMode(key: AccessPermissionKind) {
  if (key === 'organization')
    return 'private_all'
  if (key === 'specific')
    return 'private'
  return 'public'
}
