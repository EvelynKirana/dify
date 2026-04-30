import { type } from '@orpc/contract'
import { base } from '../base'

type Timestamp = string

export type ConsoleAppSummary = {
  id?: string
  name?: string
  description?: string
  icon?: string
  mode?: string
  status?: string
  createdAt?: Timestamp
}

export type ConsoleEnvironmentSummary = {
  id?: string
  name?: string
  description?: string
  runtime?: string
  backend?: string
  type?: string
  status?: string
  tags?: string[]
}

export type ConsoleReleaseSummary = {
  id?: string
  name?: string
  shortCommitId?: string
  createdAt?: Timestamp
  displayId?: string
  commitId?: string
  description?: string
  status?: string
}

export type ConsoleUser = {
  id?: string
  name?: string
  displayName?: string
}

export type DeploymentStatusCount = {
  status?: string
  count?: number
}

export type AppInstanceFilter = {
  id?: string
  name?: string
  kind?: 'all' | 'environment' | 'not_deployed' | (string & {})
}

export type AppDeploymentSummary = {
  id?: string
  name?: string
  icon?: string
  mode?: string
  sourceAppName?: string
  statuses?: DeploymentStatusCount[]
  lastDeployedAt?: Timestamp | null
}

export type Pagination = {
  total?: number
  page?: number
  limit?: number
  totalCount?: number
  perPage?: number
  currentPage?: number
  totalPages?: number
}

export type ListAppDeploymentsReply = {
  filters?: AppInstanceFilter[]
  data?: AppDeploymentSummary[]
  pagination?: Pagination
}

export type AppInstanceOverview = {
  id?: string
  name?: string
  description?: string
  sourceAppId?: string
  sourceAppName?: string
  mode?: string
  createdAt?: Timestamp
}

export type DeploymentSummaryRow = {
  environment?: ConsoleEnvironmentSummary
  release?: ConsoleReleaseSummary
  status?: string
}

export type AccessSummary = {
  accessChannelsEnabled?: boolean
  webappUrl?: string
  cliUrl?: string
  developerApiEnabled?: boolean
  apiKeyCount?: number
}

export type GetDeploymentOverviewReply = {
  instance?: AppInstanceOverview
  deployments?: DeploymentSummaryRow[]
  access?: AccessSummary
}

export type RuntimeBindingDisplay = {
  kind?: string
  label?: string
  displayValue?: string
  valueType?: string
  slot?: string
  displayName?: string
  maskedValue?: string
}

export type RuntimeEndpoints = {
  run?: string
  health?: string
}

export type RuntimeInstanceDetail = {
  deploymentName?: string
  replicas?: number
  runtimeMode?: string
  runtimeNote?: string
  endpoints?: RuntimeEndpoints
  bindings?: RuntimeBindingDisplay[]
}

export type EnvironmentDeploymentRow = {
  id?: string
  environment?: ConsoleEnvironmentSummary
  status?: string
  currentRelease?: ConsoleReleaseSummary
  detail?: RuntimeInstanceDetail
}

export type ListEnvironmentDeploymentsReply = {
  data?: EnvironmentDeploymentRow[]
}

export type EnvironmentOption = ConsoleEnvironmentSummary & {
  disabled?: boolean
  disabledReason?: string
}

export type ReleaseRuntimePreviewReply = {
  release?: ConsoleReleaseSummary
  bindings?: RuntimeBindingDisplay[]
}

export type CreateReleaseReply = {
  release?: ConsoleReleaseSummary
}

export type DeployedToSummary = {
  environmentId?: string
  environmentName?: string
  instanceStatus?: string
}

export type ReleaseHistoryRow = ConsoleReleaseSummary & {
  createdBy?: ConsoleUser
  deployedTo?: DeployedToSummary[]
  release?: ConsoleReleaseSummary
}

export type ListReleaseHistoryReply = {
  data?: ReleaseHistoryRow[]
  pagination?: Pagination
}

export type AccessPermission = {
  environment?: ConsoleEnvironmentSummary
  currentRelease?: ConsoleReleaseSummary
  accessMode?: string
  accessModeLabel?: string
  hint?: string
}

export type WebAppAccessRow = {
  environment?: ConsoleEnvironmentSummary
  url?: string
}

export type AccessChannelsSummary = {
  enabled?: boolean
  webappRows?: WebAppAccessRow[]
  cli?: {
    url?: string
  }
}

export type DeveloperAPIKeySummary = {
  id?: string
  name?: string
  environment?: ConsoleEnvironmentSummary
  environmentId?: string
  environmentName?: string
  maskedKey?: string
  maskedPrefix?: string
  token?: string
  createdAt?: Timestamp
}

export type DeveloperAPISummary = {
  enabled?: boolean
  apiKeys?: DeveloperAPIKeySummary[]
}

export type GetAccessConfigReply = {
  permissions?: AccessPermission[]
  accessChannels?: AccessChannelsSummary
  developerApi?: DeveloperAPISummary
}

export type AccessSubjectDisplay = {
  id?: string
  subjectId?: string
  subjectType?: string
  name?: string
  avatarUrl?: string
  memberCount?: number
}

export type AccessPolicyOption = {
  mode?: string
  label?: string
  selected?: boolean
  disabled?: boolean
  groups?: AccessSubjectDisplay[]
  members?: AccessSubjectDisplay[]
}

export type AccessPolicyDetail = {
  id?: string
  enabled?: boolean
  accessMode?: string
  version?: number
  options?: AccessPolicyOption[]
  subjects?: AccessSubjectDisplay[]
}

export type GetEnvironmentAccessPolicyReply = {
  policy?: AccessPolicyDetail
}

export type AccessSubject = {
  subjectId?: string
  subjectType?: string
}

export type AccessPolicy = {
  id?: string
  appInstanceId?: string
  environmentId?: string
  accessMode?: string
  subjects?: AccessSubject[]
}

export type UpdateEnvironmentAccessPolicyReply = {
  policy?: AccessPolicy
}

export type SearchAccessSubjectsReply = {
  data?: AccessSubjectDisplay[]
}

export type PatchAccessChannelReply = {
  enabled?: boolean
}

export type PatchDeveloperAPIReply = {
  enabled?: boolean
}

export type CreateDeploymentReply = {
  runtimeInstanceId?: string
  deploymentId?: string
  status?: string
}

export type CancelDeploymentReply = {
  status?: string
}

export type UndeployEnvironmentReply = {
  deploymentId?: string
  status?: string
}

export type APIToken = DeveloperAPIKeySummary

export type CreateEnvironmentAPITokenReply = {
  apiToken?: APIToken
}

export type DeleteEnvironmentAPITokenReply = Record<string, never>

export type CreateAppInstanceReply = {
  appInstanceId?: string
  initialRelease?: ConsoleReleaseSummary
}

export type GetAppInstanceSettingsReply = {
  name?: string
  description?: string
  deleteGuard?: {
    canDelete?: boolean
    disabledReason?: string
  }
}

export type UpdateAppInstanceReply = GetAppInstanceSettingsReply

export type DeleteAppInstanceReply = Record<string, never>

export type ListAppDeploymentsQuery = {
  environmentId?: string
  notDeployed?: boolean
  query?: string
  pageNumber?: number
  resultsPerPage?: number
}

export const listAppDeploymentsContract = base
  .route({
    path: '/enterprise/app-instances',
    method: 'GET',
  })
  .input(type<{
    query?: ListAppDeploymentsQuery
  }>())
  .output(type<ListAppDeploymentsReply>())

export const createAppInstanceContract = base
  .route({
    path: '/enterprise/app-instances',
    method: 'POST',
  })
  .input(type<{
    body: {
      sourceAppId: string
      name: string
      description?: string
    }
  }>())
  .output(type<CreateAppInstanceReply>())

export const deploymentOverviewContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/overview',
    method: 'GET',
  })
  .input(type<{ params: { appInstanceId: string } }>())
  .output(type<GetDeploymentOverviewReply>())

export const runtimeInstancesContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/runtime-instances',
    method: 'GET',
  })
  .input(type<{
    params: { appInstanceId: string }
  }>())
  .output(type<ListEnvironmentDeploymentsReply>())

export const previewReleaseContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/releases:preview',
    method: 'POST',
  })
  .input(type<{
    params: { appInstanceId: string }
    body: {
      releaseId?: string
    }
  }>())
  .output(type<ReleaseRuntimePreviewReply>())

export const createReleaseContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/releases',
    method: 'POST',
  })
  .input(type<{
    params: { appInstanceId: string }
    body: {
      description?: string
      name: string
    }
  }>())
  .output(type<CreateReleaseReply>())

export const releaseHistoryContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/releases',
    method: 'GET',
  })
  .input(type<{
    params: { appInstanceId: string }
    query?: {
      pageNumber?: number
      resultsPerPage?: number
    }
  }>())
  .output(type<ListReleaseHistoryReply>())

export const createDeploymentContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/deployments',
    method: 'POST',
  })
  .input(type<{
    params: {
      appInstanceId: string
    }
    body: {
      environmentId: string
      releaseId: string
    }
  }>())
  .output(type<CreateDeploymentReply>())

export const cancelDeploymentContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/runtime-instances/{runtimeInstanceId}/deployment:cancel',
    method: 'POST',
  })
  .input(type<{
    params: {
      appInstanceId: string
      runtimeInstanceId: string
    }
  }>())
  .output(type<CancelDeploymentReply>())

export const undeployEnvironmentContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/runtime-instances/{runtimeInstanceId}:undeploy',
    method: 'POST',
  })
  .input(type<{
    params: {
      appInstanceId: string
      runtimeInstanceId: string
    }
  }>())
  .output(type<UndeployEnvironmentReply>())

export const accessConfigContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/access',
    method: 'GET',
  })
  .input(type<{ params: { appInstanceId: string } }>())
  .output(type<GetAccessConfigReply>())

export const environmentAccessPolicyContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/environments/{environmentId}/access-policy',
    method: 'GET',
  })
  .input(type<{
    params: {
      appInstanceId: string
      environmentId: string
    }
  }>())
  .output(type<GetEnvironmentAccessPolicyReply>())

export const updateEnvironmentAccessPolicyContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/environments/{environmentId}/access-policy',
    method: 'PUT',
  })
  .input(type<{
    params: {
      appInstanceId: string
      environmentId: string
    }
    body: {
      accessMode: string
      subjects: AccessSubject[]
    }
  }>())
  .output(type<UpdateEnvironmentAccessPolicyReply>())

export const searchAccessSubjectsContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/access-subjects:search',
    method: 'GET',
  })
  .input(type<{
    params: { appInstanceId: string }
    query?: {
      keyword?: string
      subjectTypes?: string[]
    }
  }>())
  .output(type<SearchAccessSubjectsReply>())

export const patchAccessChannelContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/access-channels',
    method: 'PATCH',
  })
  .input(type<{
    params: {
      appInstanceId: string
    }
    body: {
      enabled: boolean
    }
  }>())
  .output(type<PatchAccessChannelReply>())

export const patchDeveloperAPIContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/developer-api',
    method: 'PATCH',
  })
  .input(type<{
    params: {
      appInstanceId: string
    }
    body: {
      enabled: boolean
    }
  }>())
  .output(type<PatchDeveloperAPIReply>())

export const createEnvironmentAPITokenContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/api-keys',
    method: 'POST',
  })
  .input(type<{
    params: {
      appInstanceId: string
    }
    body: {
      environmentId: string
      name: string
    }
  }>())
  .output(type<CreateEnvironmentAPITokenReply>())

export const deleteEnvironmentAPITokenContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/api-keys/{apiKeyId}',
    method: 'DELETE',
  })
  .input(type<{
    params: {
      appInstanceId: string
      apiKeyId: string
    }
  }>())
  .output(type<DeleteEnvironmentAPITokenReply>())

export const appInstanceSettingsContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}/settings',
    method: 'GET',
  })
  .input(type<{ params: { appInstanceId: string } }>())
  .output(type<GetAppInstanceSettingsReply>())

export const updateAppInstanceContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}',
    method: 'PATCH',
  })
  .input(type<{
    params: { appInstanceId: string }
    body: {
      name: string
      description?: string
    }
  }>())
  .output(type<UpdateAppInstanceReply>())

export const deleteAppInstanceContract = base
  .route({
    path: '/enterprise/app-instances/{appInstanceId}',
    method: 'DELETE',
  })
  .input(type<{ params: { appInstanceId: string } }>())
  .output(type<DeleteAppInstanceReply>())
