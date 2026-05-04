import type * as EnterpriseContract from '@dify/contracts/enterprise/types.gen'
import type { AppIconType } from '@/types/app'

type Timestamp = string

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
  sourceAppAvailable?: boolean
  canCreateRelease?: boolean
}

export type ConsoleEnvironmentSummary = EnterpriseContract.ConsoleEnvironment & {
  backend?: string
  description?: string
  tags?: string[]
}

export type ConsoleReleaseSummary = EnterpriseContract.ConsoleRelease & {
  commitId?: string
  description?: string
  displayId?: string
  status?: string
}

type ConsoleUser = EnterpriseContract.ConsoleUser & {
  displayName?: string
}

export type AppDeploymentSummary = EnterpriseContract.AppInstanceCard & {
  createdAt?: Timestamp
  description?: string
  status?: string
}

export type ListAppDeploymentsReply = Omit<EnterpriseContract.ListAppInstancesReply, 'data'> & {
  data?: AppDeploymentSummary[]
}

export type AppInstanceOverview = EnterpriseContract.AppInstanceBasicInfo

export type RuntimeBindingDisplay = EnterpriseContract.ReleaseRuntimeBinding & {
  displayName?: string
  maskedValue?: string
  slot?: string
}

type RuntimeInstanceDetail = Omit<EnterpriseContract.RuntimeInstanceDetail, 'bindings'> & {
  bindings?: RuntimeBindingDisplay[]
}

export type EnvironmentDeploymentRow = Omit<EnterpriseContract.RuntimeInstanceRow, 'currentRelease' | 'detail' | 'environment'> & {
  currentRelease?: ConsoleReleaseSummary
  detail?: RuntimeInstanceDetail
  environment?: ConsoleEnvironmentSummary
}

type DeploymentEnvironmentOption = EnterpriseContract.DeploymentEnvironmentOption & {
  description?: string
  runtime?: string
  tags?: string[]
}

export type ListDeploymentEnvironmentOptionsReply = Omit<EnterpriseContract.ListDeploymentEnvironmentOptionsReply, 'environments'> & {
  environments?: DeploymentEnvironmentOption[]
}

export type EnvironmentOption = DeploymentEnvironmentOption & {
  disabled?: boolean
}

export type DeployedToSummary = EnterpriseContract.DeployedEnvironment & {
  instanceStatus?: string
}

export type ReleaseHistoryRow = Omit<EnterpriseContract.ReleaseRow, 'createdBy' | 'deployedTo'> & {
  commitId?: string
  createdBy?: ConsoleUser
  deployedTo?: DeployedToSummary[]
  description?: string
  displayId?: string
  release?: ConsoleReleaseSummary
  shortCommitId?: string
  status?: string
}

export type AccessPermission = Omit<EnterpriseContract.EnvironmentAccessRow, 'currentRelease' | 'environment'> & {
  currentRelease?: ConsoleReleaseSummary
  environment?: ConsoleEnvironmentSummary
}

export type WebAppAccessRow = Omit<EnterpriseContract.WebAppAccessRow, 'environment'> & {
  environment?: ConsoleEnvironmentSummary
}

export type DeveloperAPIKeySummary = Omit<EnterpriseContract.DeveloperApiKeyRow, 'environment'> & {
  createdAt?: Timestamp
  environment?: ConsoleEnvironmentSummary
  environmentId?: string
  environmentName?: string
  maskedPrefix?: string
  token?: string
}

export type AccessSubjectDisplay = Omit<EnterpriseContract.AccessSubjectDisplay, 'memberCount'> & {
  memberCount?: number | string
  subjectId?: string
}

type AccessPolicyOption = EnterpriseContract.AccessModeOption & {
  groups?: AccessSubjectDisplay[]
  members?: AccessSubjectDisplay[]
}

export type AccessPolicyDetail = Omit<EnterpriseContract.AccessPolicyDetail, 'options' | 'subjects'> & {
  enabled?: boolean
  id?: string
  options?: AccessPolicyOption[]
  subjects?: AccessSubjectDisplay[]
  version?: number
}

export type AccessSubject = EnterpriseContract.AccessSubject

export type GetAppInstanceSettingsReply = EnterpriseContract.GetAppInstanceSettingsReply

export type ListAppDeploymentsQuery = NonNullable<EnterpriseContract.EnterpriseAppDeployConsoleListAppInstancesData['query']>
