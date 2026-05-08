import type { DeploymentEnvironmentOption } from '@dify/contracts/enterprise/types.gen'

export type EnvironmentMode = 'shared' | 'isolated'
export type EnvironmentHealth = 'ready' | 'degraded'

export type DeployStatus = 'ready' | 'deploying' | 'deploy_failed'

export type AccessPermissionKind = 'organization' | 'specific' | 'anyone'

export type EnvironmentOption = DeploymentEnvironmentOption & {
  disabled?: boolean
}
