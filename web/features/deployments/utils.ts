import type {
  ConsoleEnvironment,
  ConsoleRelease,
  ListDeploymentEnvironmentOptionsReply,
  ReleaseRow,
  ReleaseRuntimeBinding,
  RuntimeInstanceRow,
} from '@dify/contracts/enterprise/types.gen'
import type {
  AccessPermissionKind,
  EnvironmentOption,
} from './types'
import { PUBLIC_API_PREFIX } from '@/config'

export type DeploymentUiStatus = 'ready' | 'deploying' | 'deploy_failed'

export function formatDate(value?: string) {
  if (!value)
    return '—'
  return value.replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '').slice(0, 16)
}

export function environmentId(environment?: ConsoleEnvironment | EnvironmentOption) {
  return environment?.id ?? ''
}

export function environmentName(environment?: ConsoleEnvironment | EnvironmentOption) {
  return environment?.name || environment?.id || '—'
}

export function environmentMode(environment?: ConsoleEnvironment | EnvironmentOption) {
  const type = environment?.type?.toLowerCase() ?? ''
  return type.includes('isolated') ? 'isolated' : 'shared'
}

function environmentRuntimeName(environment?: ConsoleEnvironment | EnvironmentOption) {
  if (!environment)
    return ''
  if ('backend' in environment && environment.backend)
    return environment.backend
  if ('runtime' in environment && environment.runtime)
    return environment.runtime
  return ''
}

export function environmentBackend(environment?: ConsoleEnvironment | EnvironmentOption) {
  const runtime = environmentRuntimeName(environment).toLowerCase()
  return runtime.includes('host') ? 'host' : 'k8s'
}

export function environmentHealth(environment?: ConsoleEnvironment | EnvironmentOption) {
  const status = environment?.status?.toLowerCase() ?? ''
  return status.includes('ready') ? 'ready' : 'degraded'
}

export function releaseLabel(release?: ConsoleRelease | ReleaseRow) {
  return release?.name || release?.id || '—'
}

export function releaseCommit(release?: ConsoleRelease | ReleaseRow) {
  return release && 'shortCommitId' in release ? release.shortCommitId || '—' : '—'
}

export function runtimeBindingSummary(binding?: ReleaseRuntimeBinding) {
  return binding?.label || binding?.displayValue || binding?.kind || '—'
}

export function isRuntimeEnvVarBinding(binding?: ReleaseRuntimeBinding) {
  return (binding?.kind?.toLowerCase() ?? '').includes('env')
}

export function isRuntimeModelBinding(binding?: ReleaseRuntimeBinding) {
  return (binding?.kind?.toLowerCase() ?? '').includes('model')
}

export function isRuntimePluginBinding(binding?: ReleaseRuntimeBinding) {
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

export function deploymentId(row?: RuntimeInstanceRow) {
  return row?.id || ''
}

export function activeRelease(row?: RuntimeInstanceRow) {
  return row?.currentRelease
}

export function isUndeployedDeploymentRow(row?: RuntimeInstanceRow) {
  return (row?.status?.toLowerCase() ?? '').includes('undeployed') || (!row?.id && !row?.currentRelease && !row?.detail)
}

export function deploymentStatus(row: RuntimeInstanceRow): DeploymentUiStatus {
  const runtimeStatus = row.status?.toLowerCase() ?? ''
  if (runtimeStatus.includes('deploying') || runtimeStatus.includes('pending'))
    return 'deploying'
  if (runtimeStatus.includes('fail') || runtimeStatus.includes('error'))
    return 'deploy_failed'
  return 'ready'
}

export function deployedRows(rows?: RuntimeInstanceRow[]) {
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
