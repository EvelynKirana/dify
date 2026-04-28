import type { AccessPermissionKind } from './types'
import type {
  ConsoleEnvironmentSummary,
  ConsoleReleaseSummary,
  EnvironmentDeploymentRow,
  EnvironmentOption,
} from '@/contract/console/deployments'
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
  const runtime = environment?.runtime?.toLowerCase() ?? ''
  return runtime.includes('host') ? 'host' : 'k8s'
}

export const environmentHealth = (environment?: ConsoleEnvironmentSummary | EnvironmentOption) => {
  const status = environment?.status?.toLowerCase() ?? ''
  return status.includes('ready') ? 'ready' : 'degraded'
}

export const releaseId = (release?: ConsoleReleaseSummary) => release?.id ?? ''

export const releaseLabel = (release?: ConsoleReleaseSummary) => release?.displayId || release?.id || '—'

export const releaseCommit = (release?: ConsoleReleaseSummary) => release?.commitId || '—'

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
  row?.pendingDeployment?.deploymentId || row?.instance?.currentDeploymentId || ''

export const activeRelease = (row?: EnvironmentDeploymentRow) => row?.observedRuntime?.release

export const targetRelease = (row?: EnvironmentDeploymentRow) => row?.pendingDeployment?.release

export const failedReleaseId = (row?: EnvironmentDeploymentRow) => row?.instance?.lastError?.releaseId

export const deploymentStatus = (row: EnvironmentDeploymentRow): DeploymentUiStatus => {
  if (row.pendingDeployment)
    return 'deploying'
  if (row.instance?.lastError)
    return 'deploy_failed'

  const status = row.instance?.status?.toLowerCase() ?? ''
  if (status.includes('deploying') || status.includes('pending'))
    return 'deploying'
  if (status.includes('fail') || status.includes('error'))
    return 'deploy_failed'
  return 'ready'
}

export const deployedRows = (rows?: EnvironmentDeploymentRow[]) =>
  rows?.filter(row => row.environment?.id && (row.instance || row.observedRuntime || row.pendingDeployment)) ?? []

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
