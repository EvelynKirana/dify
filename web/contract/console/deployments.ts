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
  type?: string
  status?: string
  tags?: string[]
}

export type ConsoleReleaseSummary = {
  id?: string
  displayId?: string
  status?: string
  description?: string
  commitId?: string
  createdAt?: Timestamp
  name?: string
}

export type LastErrorProto = {
  phase?: string
  code?: string
  message?: string
  releaseId?: string
}

export type ConsoleInstanceSummary = {
  id?: string
  replicas?: number
  status?: string
  desiredReleaseId?: string
  desiredReleaseDisplayId?: string
  observedReleaseId?: string
  observedReleaseDisplayId?: string
  currentDeploymentId?: string
  lastDeployedAt?: Timestamp
  lastReadyAt?: Timestamp
  lastError?: LastErrorProto
}

export type ConsoleActions = {
  canDeploy?: boolean
  canDeployAnotherRelease?: boolean
  canCancel?: boolean
  canUndeploy?: boolean
  canRollback?: boolean
  canViewProgress?: boolean
  canViewLogs?: boolean
  disabledReason?: string
}

export type ConsoleWarning = {
  code?: string
  message?: string
}

export type DeploymentStatusCount = {
  status?: string
  count?: number
}

export type AppDeploymentSummary = {
  app?: ConsoleAppSummary
  statusCounts?: DeploymentStatusCount[]
  deployed?: boolean
  lastDeployedAt?: Timestamp | null
}

export type ListAppDeploymentsReply = {
  data?: AppDeploymentSummary[]
  environmentOptions?: EnvironmentOption[]
  pagination?: Pagination
}

export type DeploymentSummaryRow = {
  environmentId?: string
  environmentName?: string
  releaseId?: string
  releaseDisplayId?: string
  status?: string
}

export type ChannelSummary = {
  enabled?: boolean
}

export type AccessSummary = {
  webapp?: ChannelSummary
  cli?: ChannelSummary
  api?: ChannelSummary
  mcp?: ChannelSummary
}

export type GetDeploymentOverviewReply = {
  app?: ConsoleAppSummary
  deployments?: DeploymentSummaryRow[]
  access?: AccessSummary
  warnings?: ConsoleWarning[]
}

export type RuntimeBindingDisplay = {
  slot?: string
  displayName?: string
  maskedValue?: string
}

export type RuntimeBindings = {
  credentials?: RuntimeBindingDisplay[]
  envVars?: RuntimeBindingDisplay[]
}

export type RuntimeEndpoints = {
  run?: string
  health?: string
}

export type ObservedRuntime = {
  release?: ConsoleReleaseSummary
  bindings?: RuntimeBindings
  endpoints?: RuntimeEndpoints
}

export type PendingDeployment = {
  deploymentId?: string
  release?: ConsoleReleaseSummary
  bindings?: RuntimeBindings
}

export type EnvironmentDeploymentRow = {
  environment?: ConsoleEnvironmentSummary
  instance?: ConsoleInstanceSummary
  observedRuntime?: ObservedRuntime
  pendingDeployment?: PendingDeployment
  actions?: ConsoleActions
}

export type Pagination = {
  totalCount?: number
  perPage?: number
  currentPage?: number
  totalPages?: number
}

export type ListEnvironmentDeploymentsReply = {
  environmentDeployments?: EnvironmentDeploymentRow[]
  pagination?: Pagination
}

export type EnvironmentOption = {
  id?: string
  name?: string
  type?: string
  status?: string
  description?: string
  tags?: string[]
  disabled?: boolean
  disabledReason?: string
}

export type ListDeploymentCandidatesReply = {
  defaultReleaseId?: string
  releases?: ConsoleReleaseSummary[]
  environmentOptions?: EnvironmentOption[]
}

export type CurrentInstanceState = {
  instanceId?: string
  status?: string
  observedReleaseDisplayId?: string
}

export type ConsoleCredentialOption = {
  id?: string
  displayName?: string
  pluginId?: string
  provider?: string
}

export type ConsoleEnvVarOption = {
  id?: string
  name?: string
  maskedValue?: string
  valueType?: string
  version?: number
}

export type DeploymentSlot = {
  kind?: string
  slot?: string
  label?: string
  required?: boolean
  selectedCredentialId?: string
  selectedEnvVarId?: string
  credentialOptions?: ConsoleCredentialOption[]
  envVarOptions?: ConsoleEnvVarOption[]
  missing?: boolean
  missingReason?: string
}

export type DeploymentBlocker = {
  code?: string
  message?: string
}

export type GetDeploymentPlanReply = {
  release?: ConsoleReleaseSummary
  environment?: ConsoleEnvironmentSummary
  currentInstance?: CurrentInstanceState
  slots?: DeploymentSlot[]
  canDeploy?: boolean
  blockers?: DeploymentBlocker[]
}

export type UserDisplay = {
  id?: string
  displayName?: string
}

export type DeployedToSummary = {
  environmentId?: string
  environmentName?: string
  instanceStatus?: string
}

export type ReleaseHistoryActions = {
  canDeploy?: boolean
  canViewDetail?: boolean
  canDelete?: boolean
}

export type ReleaseHistoryRow = {
  release?: ConsoleReleaseSummary
  createdBy?: UserDisplay
  deployedTo?: DeployedToSummary[]
  actions?: ReleaseHistoryActions
}

export type ListReleaseHistoryReply = {
  data?: ReleaseHistoryRow[]
  pagination?: Pagination
}

export type EffectivePolicySummary = {
  channel?: string
  enabled?: boolean
  accessMode?: string
  label?: string
  subjectCount?: number
  version?: number
}

export type EnvironmentPolicySummary = {
  environment?: ConsoleEnvironmentSummary
  effectivePolicy?: EffectivePolicySummary
}

export type UserAccessSummary = {
  sharedChannels?: string[]
  environmentPolicies?: EnvironmentPolicySummary[]
}

export type WebAppAccessRow = {
  environment?: ConsoleEnvironmentSummary
  url?: string
  publicCode?: string
  canCopy?: boolean
  canShowQrCode?: boolean
  canRegenerate?: boolean
  createNeeded?: boolean
}

export type WebAppAccessSummary = {
  supported?: boolean
  enabled?: boolean
  rows?: WebAppAccessRow[]
}

export type UnsupportedChannelSummary = {
  supported?: boolean
  statusLabel?: string
}

export type CliAccessSummary = {
  supported?: boolean
  enabled?: boolean
  statusLabel?: string
  url?: string
}

export type DeveloperAPIKeySummary = {
  id?: string
  environmentId?: string
  environmentName?: string
  name?: string
  maskedPrefix?: string
  createdAt?: Timestamp
}

export type DeveloperAPISummary = {
  enabled?: boolean
  apiKeys?: DeveloperAPIKeySummary[]
}

export type GetAccessConfigReply = {
  userAccess?: UserAccessSummary
  webapp?: WebAppAccessSummary
  mcp?: UnsupportedChannelSummary
  cli?: CliAccessSummary
  developerApi?: DeveloperAPISummary
}

export type AccessSubjectDisplay = {
  id?: string
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
  channel?: string
  enabled?: boolean
  accessMode?: string
  version?: number
  options?: AccessPolicyOption[]
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
  appId?: string
  environmentId?: string
  scopeType?: string
  channel?: string
  enabled?: boolean
  accessMode?: string
  subjects?: AccessSubject[]
  version?: number
  subjectCount?: number
}

export type UpdateEnvironmentAccessPolicyReply = {
  policy?: AccessPolicy
}

export type SearchAccessSubjectsReply = {
  data?: AccessSubjectDisplay[]
}

export type PatchAccessChannelReply = {
  policy?: EffectivePolicySummary
}

export type Release = {
  id?: string
  appId?: string
  seq?: number
  displayId?: string
  status?: string
  gateCommitId?: string
  dslVersion?: string
  description?: string
  requiredPluginIds?: string[]
  requiredModelSlots?: string[]
  requiredEnvVarNames?: string[]
  createdAt?: Timestamp
  readyAt?: Timestamp
  name?: string
}

export type CreateReleaseReply = {
  release?: Release
}

export type CredentialBindingProto = {
  slot?: string
  credentialId?: string
}

export type EnvVarBindingProto = {
  slot?: string
  envVarId?: string
}

export type BindingsProto = {
  models?: CredentialBindingProto[]
  plugins?: CredentialBindingProto[]
  envVars?: EnvVarBindingProto[]
}

export type CreateReleaseFromCurrentApp = {
  releaseNote?: string
}

export type CreateDeploymentReply = {
  instanceId?: string
  deploymentId?: string
  status?: string
  release?: Release
}

export type CancelDeploymentReply = {
  status?: string
}

export type UndeployEnvironmentReply = {
  deploymentId?: string
}

export type RollbackEnvironmentReply = {
  deploymentId?: string
}

export type APIToken = {
  id?: string
  appId?: string
  environmentId?: string
  name?: string
  token?: string
  maskedPrefix?: string
  createdAt?: Timestamp
  lastUsedAt?: Timestamp
}

export type ListEnvironmentAPITokensReply = {
  data?: APIToken[]
}

export type CreateEnvironmentAPITokenReply = {
  apiToken?: APIToken
}

export type DeleteEnvironmentAPITokenReply = Record<string, never>

export const listAppDeploymentsContract = base
  .route({
    path: '/enterprise/deployments',
    method: 'GET',
  })
  .input(type<{
    query?: {
      environmentId?: string
      keyword?: string
      pageNumber?: number
      resultsPerPage?: number
    }
  }>())
  .output(type<ListAppDeploymentsReply>())

export const deploymentOverviewContract = base
  .route({
    path: '/enterprise/apps/{appId}/deploy/overview',
    method: 'GET',
  })
  .input(type<{ params: { appId: string } }>())
  .output(type<GetDeploymentOverviewReply>())

export const environmentDeploymentsContract = base
  .route({
    path: '/enterprise/apps/{appId}/deploy/environment-deployments',
    method: 'GET',
  })
  .input(type<{
    params: { appId: string }
    query?: {
      pageNumber?: number
      resultsPerPage?: number
    }
  }>())
  .output(type<ListEnvironmentDeploymentsReply>())

export const deploymentCandidatesContract = base
  .route({
    path: '/enterprise/apps/{appId}/deploy/deployment-candidates',
    method: 'GET',
  })
  .input(type<{ params: { appId: string } }>())
  .output(type<ListDeploymentCandidatesReply>())

export const deploymentPlanContract = base
  .route({
    path: '/enterprise/apps/{appId}/environments/{environmentId}/releases/{releaseId}/deployment-plan',
    method: 'GET',
  })
  .input(type<{
    params: {
      appId: string
      environmentId: string
      releaseId: string
    }
  }>())
  .output(type<GetDeploymentPlanReply>())

export const releaseHistoryContract = base
  .route({
    path: '/enterprise/apps/{appId}/deploy/release-history',
    method: 'GET',
  })
  .input(type<{
    params: { appId: string }
    query?: {
      pageNumber?: number
      resultsPerPage?: number
    }
  }>())
  .output(type<ListReleaseHistoryReply>())

export const accessConfigContract = base
  .route({
    path: '/enterprise/apps/{appId}/deploy/access-config',
    method: 'GET',
  })
  .input(type<{ params: { appId: string } }>())
  .output(type<GetAccessConfigReply>())

export const environmentAccessPolicyContract = base
  .route({
    path: '/enterprise/apps/{appId}/environments/{environmentId}/deploy/access-policies/{channel}',
    method: 'GET',
  })
  .input(type<{
    params: {
      appId: string
      environmentId: string
      channel: string
    }
  }>())
  .output(type<GetEnvironmentAccessPolicyReply>())

export const updateEnvironmentAccessPolicyContract = base
  .route({
    path: '/enterprise/apps/{appId}/environments/{environmentId}/deploy/access-policies/{channel}',
    method: 'PUT',
  })
  .input(type<{
    params: {
      appId: string
      environmentId: string
      channel: string
    }
    body: {
      channel: string
      enabled: boolean
      accessMode: string
      subjects: AccessSubject[]
      expectedVersion: number
    }
  }>())
  .output(type<UpdateEnvironmentAccessPolicyReply>())

export const searchAccessSubjectsContract = base
  .route({
    path: '/enterprise/apps/{appId}/deploy/access-subjects:search',
    method: 'GET',
  })
  .input(type<{
    params: { appId: string }
    query?: {
      keyword?: string
      subjectTypes?: string[]
    }
  }>())
  .output(type<SearchAccessSubjectsReply>())

export const patchAccessChannelContract = base
  .route({
    path: '/enterprise/apps/{appId}/deploy/access-channels/{channel}',
    method: 'PATCH',
  })
  .input(type<{
    params: {
      appId: string
      channel: string
    }
    body: {
      channel: string
      enabled: boolean
      expectedVersion: number
    }
  }>())
  .output(type<PatchAccessChannelReply>())

export const createReleaseContract = base
  .route({
    path: '/enterprise/apps/{appId}/deploy/releases',
    method: 'POST',
  })
  .input(type<{
    params: { appId: string }
    body: {
      description?: string
      name: string
    }
  }>())
  .output(type<CreateReleaseReply>())

export const createDeploymentContract = base
  .route({
    path: '/enterprise/apps/{appId}/environments/{environmentId}/deployments',
    method: 'POST',
  })
  .input(type<{
    params: {
      appId: string
      environmentId: string
    }
    body: {
      releaseId?: string
      currentApp?: CreateReleaseFromCurrentApp
      bindings?: BindingsProto
      replicas?: number
      idempotencyKey?: string
    }
  }>())
  .output(type<CreateDeploymentReply>())

export const cancelDeploymentContract = base
  .route({
    path: '/enterprise/apps/{appId}/environments/{environmentId}/deployments/{deploymentId}/cancel',
    method: 'POST',
  })
  .input(type<{
    params: {
      appId: string
      environmentId: string
      deploymentId: string
    }
    body: {
      idempotencyKey?: string
    }
  }>())
  .output(type<CancelDeploymentReply>())

export const undeployEnvironmentContract = base
  .route({
    path: '/enterprise/apps/{appId}/environments/{environmentId}/deployments:undeploy',
    method: 'POST',
  })
  .input(type<{
    params: {
      appId: string
      environmentId: string
    }
    body: {
      idempotencyKey?: string
    }
  }>())
  .output(type<UndeployEnvironmentReply>())

export const rollbackEnvironmentContract = base
  .route({
    path: '/enterprise/apps/{appId}/environments/{environmentId}/deployments:rollback',
    method: 'POST',
  })
  .input(type<{
    params: {
      appId: string
      environmentId: string
    }
    body: {
      targetReleaseId?: string
      idempotencyKey?: string
    }
  }>())
  .output(type<RollbackEnvironmentReply>())

export const environmentAPITokensContract = base
  .route({
    path: '/enterprise/apps/{appId}/environments/{environmentId}/api-keys',
    method: 'GET',
  })
  .input(type<{
    params: {
      appId: string
      environmentId: string
    }
  }>())
  .output(type<ListEnvironmentAPITokensReply>())

export const createEnvironmentAPITokenContract = base
  .route({
    path: '/enterprise/apps/{appId}/environments/{environmentId}/api-keys',
    method: 'POST',
  })
  .input(type<{
    params: {
      appId: string
      environmentId: string
    }
    body: {
      name: string
    }
  }>())
  .output(type<CreateEnvironmentAPITokenReply>())

export const deleteEnvironmentAPITokenContract = base
  .route({
    path: '/enterprise/apps/{appId}/environments/{environmentId}/api-keys/{apiKeyId}',
    method: 'DELETE',
  })
  .input(type<{
    params: {
      appId: string
      environmentId: string
      apiKeyId: string
    }
  }>())
  .output(type<DeleteEnvironmentAPITokenReply>())
