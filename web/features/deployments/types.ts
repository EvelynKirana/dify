import type {
  DifyEnterpriseApiEnterpriseAccessChannels,
  DifyEnterpriseApiEnterpriseAccessModeOption,
  DifyEnterpriseApiEnterpriseAccessPolicyDetail,
  DifyEnterpriseApiEnterpriseAccessStatus,
  DifyEnterpriseApiEnterpriseAccessSubject,
  DifyEnterpriseApiEnterpriseAccessSubjectDisplay,
  DifyEnterpriseApiEnterpriseAppInstanceBasicInfo,
  DifyEnterpriseApiEnterpriseAppInstanceCard,
  DifyEnterpriseApiEnterpriseCancelRuntimeDeploymentReply,
  DifyEnterpriseApiEnterpriseConsoleEnvironment,
  DifyEnterpriseApiEnterpriseConsoleRelease,
  DifyEnterpriseApiEnterpriseConsoleUser,
  DifyEnterpriseApiEnterpriseCreateAppInstanceReply,
  DifyEnterpriseApiEnterpriseCreateDeploymentReply,
  DifyEnterpriseApiEnterpriseCreateDeveloperApiKeyReply,
  DifyEnterpriseApiEnterpriseCreateReleaseReply,
  DifyEnterpriseApiEnterpriseDeleteAppInstanceReply,
  DifyEnterpriseApiEnterpriseDeleteDeveloperApiKeyReply,
  DifyEnterpriseApiEnterpriseDeployedEnvironment,
  DifyEnterpriseApiEnterpriseDeploymentEnvironmentOption,
  DifyEnterpriseApiEnterpriseDeploymentStatusRow,
  DifyEnterpriseApiEnterpriseDeveloperApiAccess,
  DifyEnterpriseApiEnterpriseDeveloperApiKeyRow,
  DifyEnterpriseApiEnterpriseEnvironmentAccessRow,
  DifyEnterpriseApiEnterpriseGetAppInstanceAccessReply,
  DifyEnterpriseApiEnterpriseGetAppInstanceOverviewReply,
  DifyEnterpriseApiEnterpriseGetAppInstanceSettingsReply,
  DifyEnterpriseApiEnterpriseGetEnvironmentAccessPolicyReply,
  DifyEnterpriseApiEnterpriseListAppInstancesReply,
  DifyEnterpriseApiEnterpriseListDeploymentEnvironmentOptionsReply,
  DifyEnterpriseApiEnterpriseListReleasesReply,
  DifyEnterpriseApiEnterpriseListRuntimeInstancesReply,
  DifyEnterpriseApiEnterprisePreviewReleaseReply,
  DifyEnterpriseApiEnterpriseReleaseRow,
  DifyEnterpriseApiEnterpriseReleaseRuntimeBinding,
  DifyEnterpriseApiEnterpriseRuntimeEndpoints,
  DifyEnterpriseApiEnterpriseRuntimeInstanceDetail,
  DifyEnterpriseApiEnterpriseRuntimeInstanceRow,
  DifyEnterpriseApiEnterpriseSearchAccessSubjectsReply,
  DifyEnterpriseApiEnterpriseStatusCount,
  DifyEnterpriseApiEnterpriseUndeployRuntimeInstanceReply,
  DifyEnterpriseApiEnterpriseUpdateAccessChannelsReply,
  DifyEnterpriseApiEnterpriseUpdateAppInstanceReply,
  DifyEnterpriseApiEnterpriseUpdateDeveloperApiReply,
  DifyEnterpriseApiEnterpriseUpdateEnvironmentAccessPolicyReply,
  DifyEnterpriseApiEnterpriseWebAppAccessRow,
  EnterpriseAppDeployConsoleListAppInstancesData,
  PaginationPagination,
} from '@/contract/generated/enterprise/types.gen'
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
}

export type ConsoleAppSummary = {
  id?: string
  name?: string
  description?: string
  icon?: string
  mode?: string
  status?: string
  createdAt?: Timestamp
}

export type ConsoleEnvironmentSummary = DifyEnterpriseApiEnterpriseConsoleEnvironment & {
  backend?: string
  description?: string
  tags?: string[]
}

export type ConsoleReleaseSummary = DifyEnterpriseApiEnterpriseConsoleRelease & {
  commitId?: string
  description?: string
  displayId?: string
  status?: string
}

export type ConsoleUser = DifyEnterpriseApiEnterpriseConsoleUser & {
  displayName?: string
}

export type DeploymentStatusCount = DifyEnterpriseApiEnterpriseStatusCount

export type AppDeploymentSummary = DifyEnterpriseApiEnterpriseAppInstanceCard & {
  createdAt?: Timestamp
  description?: string
  status?: string
}

export type Pagination = PaginationPagination

export type ListAppDeploymentsReply = Omit<DifyEnterpriseApiEnterpriseListAppInstancesReply, 'data'> & {
  data?: AppDeploymentSummary[]
}

export type AppInstanceOverview = DifyEnterpriseApiEnterpriseAppInstanceBasicInfo

export type DeploymentSummaryRow = Omit<DifyEnterpriseApiEnterpriseDeploymentStatusRow, 'environment' | 'release'> & {
  environment?: ConsoleEnvironmentSummary
  release?: ConsoleReleaseSummary
}

export type AccessSummary = DifyEnterpriseApiEnterpriseAccessStatus

export type GetDeploymentOverviewReply = Omit<DifyEnterpriseApiEnterpriseGetAppInstanceOverviewReply, 'deployments' | 'instance'> & {
  deployments?: DeploymentSummaryRow[]
  instance?: AppInstanceOverview
}

export type RuntimeBindingDisplay = DifyEnterpriseApiEnterpriseReleaseRuntimeBinding & {
  displayName?: string
  maskedValue?: string
  slot?: string
}

export type RuntimeEndpoints = DifyEnterpriseApiEnterpriseRuntimeEndpoints

export type RuntimeInstanceDetail = Omit<DifyEnterpriseApiEnterpriseRuntimeInstanceDetail, 'bindings'> & {
  bindings?: RuntimeBindingDisplay[]
}

export type EnvironmentDeploymentRow = Omit<DifyEnterpriseApiEnterpriseRuntimeInstanceRow, 'currentRelease' | 'detail' | 'environment'> & {
  currentRelease?: ConsoleReleaseSummary
  detail?: RuntimeInstanceDetail
  environment?: ConsoleEnvironmentSummary
}

export type ListEnvironmentDeploymentsReply = Omit<DifyEnterpriseApiEnterpriseListRuntimeInstancesReply, 'data'> & {
  data?: EnvironmentDeploymentRow[]
}

export type DeploymentEnvironmentOption = DifyEnterpriseApiEnterpriseDeploymentEnvironmentOption & {
  description?: string
  runtime?: string
  tags?: string[]
}

export type ListDeploymentEnvironmentOptionsReply = Omit<DifyEnterpriseApiEnterpriseListDeploymentEnvironmentOptionsReply, 'environments'> & {
  environments?: DeploymentEnvironmentOption[]
}

export type EnvironmentOption = DeploymentEnvironmentOption & {
  disabled?: boolean
}

export type ReleaseRuntimePreviewReply = Omit<DifyEnterpriseApiEnterprisePreviewReleaseReply, 'bindings' | 'release'> & {
  bindings?: RuntimeBindingDisplay[]
  release?: ConsoleReleaseSummary
}

export type CreateReleaseReply = Omit<DifyEnterpriseApiEnterpriseCreateReleaseReply, 'release'> & {
  release?: ConsoleReleaseSummary
}

export type DeployedToSummary = DifyEnterpriseApiEnterpriseDeployedEnvironment & {
  instanceStatus?: string
}

export type ReleaseHistoryRow = Omit<DifyEnterpriseApiEnterpriseReleaseRow, 'createdBy' | 'deployedTo'> & {
  commitId?: string
  createdBy?: ConsoleUser
  deployedTo?: DeployedToSummary[]
  description?: string
  displayId?: string
  release?: ConsoleReleaseSummary
  shortCommitId?: string
  status?: string
}

export type ListReleaseHistoryReply = Omit<DifyEnterpriseApiEnterpriseListReleasesReply, 'data'> & {
  data?: ReleaseHistoryRow[]
}

export type AccessPermission = Omit<DifyEnterpriseApiEnterpriseEnvironmentAccessRow, 'currentRelease' | 'environment'> & {
  currentRelease?: ConsoleReleaseSummary
  environment?: ConsoleEnvironmentSummary
}

export type WebAppAccessRow = Omit<DifyEnterpriseApiEnterpriseWebAppAccessRow, 'environment'> & {
  environment?: ConsoleEnvironmentSummary
}

export type AccessChannelsSummary = Omit<DifyEnterpriseApiEnterpriseAccessChannels, 'webappRows'> & {
  webappRows?: WebAppAccessRow[]
}

export type DeveloperAPIKeySummary = Omit<DifyEnterpriseApiEnterpriseDeveloperApiKeyRow, 'environment'> & {
  createdAt?: Timestamp
  environment?: ConsoleEnvironmentSummary
  environmentId?: string
  environmentName?: string
  maskedPrefix?: string
  token?: string
}

export type DeveloperAPISummary = Omit<DifyEnterpriseApiEnterpriseDeveloperApiAccess, 'apiKeys'> & {
  apiKeys?: DeveloperAPIKeySummary[]
}

export type GetAccessConfigReply = Omit<DifyEnterpriseApiEnterpriseGetAppInstanceAccessReply, 'accessChannels' | 'developerApi' | 'permissions'> & {
  accessChannels?: AccessChannelsSummary
  developerApi?: DeveloperAPISummary
  permissions?: AccessPermission[]
}

export type AccessSubjectDisplay = Omit<DifyEnterpriseApiEnterpriseAccessSubjectDisplay, 'memberCount'> & {
  memberCount?: number | string
  subjectId?: string
}

export type AccessPolicyOption = DifyEnterpriseApiEnterpriseAccessModeOption & {
  groups?: AccessSubjectDisplay[]
  members?: AccessSubjectDisplay[]
}

export type AccessPolicyDetail = Omit<DifyEnterpriseApiEnterpriseAccessPolicyDetail, 'options' | 'subjects'> & {
  enabled?: boolean
  id?: string
  options?: AccessPolicyOption[]
  subjects?: AccessSubjectDisplay[]
  version?: number
}

export type GetEnvironmentAccessPolicyReply = Omit<DifyEnterpriseApiEnterpriseGetEnvironmentAccessPolicyReply, 'policy'> & {
  policy?: AccessPolicyDetail
}

export type AccessSubject = DifyEnterpriseApiEnterpriseAccessSubject

export type AccessPolicy = {
  accessMode?: string
  appInstanceId?: string
  environmentId?: string
  id?: string
  subjects?: AccessSubject[]
}

export type UpdateEnvironmentAccessPolicyReply = DifyEnterpriseApiEnterpriseUpdateEnvironmentAccessPolicyReply

export type SearchAccessSubjectsReply = Omit<DifyEnterpriseApiEnterpriseSearchAccessSubjectsReply, 'data'> & {
  data?: AccessSubjectDisplay[]
}

export type PatchAccessChannelReply = DifyEnterpriseApiEnterpriseUpdateAccessChannelsReply

export type PatchDeveloperAPIReply = DifyEnterpriseApiEnterpriseUpdateDeveloperApiReply

export type CreateDeploymentReply = DifyEnterpriseApiEnterpriseCreateDeploymentReply

export type CancelDeploymentReply = DifyEnterpriseApiEnterpriseCancelRuntimeDeploymentReply

export type UndeployEnvironmentReply = DifyEnterpriseApiEnterpriseUndeployRuntimeInstanceReply

export type APIToken = DeveloperAPIKeySummary

export type CreateEnvironmentAPITokenReply = DifyEnterpriseApiEnterpriseCreateDeveloperApiKeyReply

export type DeleteEnvironmentAPITokenReply = DifyEnterpriseApiEnterpriseDeleteDeveloperApiKeyReply

export type CreateAppInstanceReply = Omit<DifyEnterpriseApiEnterpriseCreateAppInstanceReply, 'initialRelease'> & {
  initialRelease?: ConsoleReleaseSummary
}

export type GetAppInstanceSettingsReply = DifyEnterpriseApiEnterpriseGetAppInstanceSettingsReply

export type UpdateAppInstanceReply = DifyEnterpriseApiEnterpriseUpdateAppInstanceReply

export type DeleteAppInstanceReply = DifyEnterpriseApiEnterpriseDeleteAppInstanceReply

export type ListAppDeploymentsQuery = NonNullable<EnterpriseAppDeployConsoleListAppInstancesData['query']>
