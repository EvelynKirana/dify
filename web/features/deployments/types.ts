import type { AppIconType } from '@/types/app'

export type EnvironmentMode = 'shared' | 'isolated'
export type EnvironmentHealth = 'ready' | 'degraded'

export type DeployStatus = 'ready' | 'deploying' | 'deploy_failed'

export type AppMode = 'chat' | 'agent-chat' | 'workflow' | 'completion' | 'advanced-chat' | (string & {})

export type AccessPermissionKind = 'organization' | 'specific' | 'anyone'

export type AppInfo = {
  id: string
  name: string
  mode: AppMode
  iconType?: AppIconType | null
  icon?: string
  iconBackground?: string
  iconUrl?: string | null
  description?: string
  sourceAppId?: string
  sourceAppName?: string
}
