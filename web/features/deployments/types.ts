import type * as EnterpriseContract from '@dify/contracts/enterprise/types.gen'

export type EnvironmentMode = 'shared' | 'isolated'
export type EnvironmentHealth = 'ready' | 'degraded'

export type DeployStatus = 'ready' | 'deploying' | 'deploy_failed'

export type AccessPermissionKind = 'organization' | 'specific' | 'anyone'

export type ConsoleEnvironmentSummary = EnterpriseContract.ConsoleEnvironment
export type ConsoleReleaseSummary = EnterpriseContract.ConsoleRelease
export type RuntimeBindingDisplay = EnterpriseContract.ReleaseRuntimeBinding
export type EnvironmentDeploymentRow = EnterpriseContract.RuntimeInstanceRow
export type ListDeploymentEnvironmentOptionsReply = EnterpriseContract.ListDeploymentEnvironmentOptionsReply
export type EnvironmentOption = EnterpriseContract.DeploymentEnvironmentOption & {
  disabled?: boolean
}
export type DeployedToSummary = EnterpriseContract.DeployedEnvironment
export type ReleaseHistoryRow = EnterpriseContract.ReleaseRow
export type AccessPermission = EnterpriseContract.EnvironmentAccessRow
export type WebAppAccessRow = EnterpriseContract.WebAppAccessRow
export type DeveloperAPIKeySummary = EnterpriseContract.DeveloperApiKeyRow
export type AccessSubjectDisplay = EnterpriseContract.AccessSubjectDisplay
export type AccessPolicyDetail = EnterpriseContract.AccessPolicyDetail
export type AccessSubject = EnterpriseContract.AccessSubject

export type GetAppInstanceSettingsReply = EnterpriseContract.GetAppInstanceSettingsReply

export type ListAppDeploymentsQuery = NonNullable<EnterpriseContract.EnterpriseAppDeployConsoleListAppInstancesData['query']>
