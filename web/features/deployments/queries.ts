import type { ListAppDeploymentsQuery } from '@/features/deployments/types'
import { skipToken } from '@tanstack/react-query'
import { consoleQuery } from '@/service/client'
import { DEPLOYMENT_PAGE_SIZE, SOURCE_APPS_PAGE_SIZE } from './data'

export const deploymentsListQueryOptions = (query: ListAppDeploymentsQuery = {}) =>
  consoleQuery.enterprise.enterpriseAppDeployConsole.listAppInstances.queryOptions({
    input: {
      query: {
        pageNumber: 1,
        resultsPerPage: SOURCE_APPS_PAGE_SIZE,
        ...query,
      },
    },
  })

export const deploymentsListQueryKey = () =>
  consoleQuery.enterprise.enterpriseAppDeployConsole.listAppInstances.key({ type: 'query' })

export const deploymentAppInstanceInput = (appInstanceId: string) => ({
  params: { appInstanceId },
})

export const deploymentAppInstanceQueryKey = (appInstanceId: string) => ({
  type: 'query' as const,
  input: deploymentAppInstanceInput(appInstanceId),
})

export const deploymentEnvironmentAccessPolicyQueryKey = (
  appInstanceId: string,
  environmentId: string,
) => ({
  type: 'query' as const,
  input: {
    params: {
      appInstanceId,
      environmentId,
    },
  },
})

export const deploymentOverviewQueryKey = (appInstanceId: string) =>
  consoleQuery.enterprise.enterpriseAppDeployConsole.getAppInstanceOverview.key(deploymentAppInstanceQueryKey(appInstanceId))

export const deploymentSettingsQueryKey = (appInstanceId: string) =>
  consoleQuery.enterprise.enterpriseAppDeployConsole.getAppInstanceSettings.key(deploymentAppInstanceQueryKey(appInstanceId))

export const deploymentEnvironmentDeploymentsQueryKey = (appInstanceId: string) =>
  consoleQuery.enterprise.enterpriseAppDeployConsole.listRuntimeInstances.key(deploymentAppInstanceQueryKey(appInstanceId))

export const deploymentReleaseHistoryQueryKey = (appInstanceId: string) =>
  consoleQuery.enterprise.enterpriseAppDeployConsole.listReleases.key(deploymentAppInstanceQueryKey(appInstanceId))

export const deploymentAccessConfigQueryKey = (appInstanceId: string) =>
  consoleQuery.enterprise.enterpriseAppDeployConsole.getAppInstanceAccess.key(deploymentAppInstanceQueryKey(appInstanceId))

export const deploymentEnvironmentAccessPolicyQueryKeyForEnvironment = (
  appInstanceId: string,
  environmentId: string,
) =>
  consoleQuery.enterprise.enterpriseAppDeployConsole.getEnvironmentAccessPolicy.key(
    deploymentEnvironmentAccessPolicyQueryKey(appInstanceId, environmentId),
  )

export const deploymentEnvironmentAccessPoliciesQueryKey = (appInstanceId: string) =>
  consoleQuery.enterprise.enterpriseAppDeployConsole.getEnvironmentAccessPolicy.key(deploymentAppInstanceQueryKey(appInstanceId))

export const deploymentInstanceIdentityQueryKeys = (appInstanceId: string) => [
  deploymentsListQueryKey(),
  deploymentOverviewQueryKey(appInstanceId),
  deploymentSettingsQueryKey(appInstanceId),
]

export const deploymentInstanceStateQueryKeys = (appInstanceId: string) => [
  deploymentsListQueryKey(),
  deploymentOverviewQueryKey(appInstanceId),
  deploymentEnvironmentDeploymentsQueryKey(appInstanceId),
  deploymentReleaseHistoryQueryKey(appInstanceId),
  deploymentAccessConfigQueryKey(appInstanceId),
]

export const deploymentInstanceDetailQueryKeys = (appInstanceId: string) => [
  deploymentOverviewQueryKey(appInstanceId),
  deploymentSettingsQueryKey(appInstanceId),
  deploymentEnvironmentDeploymentsQueryKey(appInstanceId),
  deploymentReleaseHistoryQueryKey(appInstanceId),
  deploymentAccessConfigQueryKey(appInstanceId),
  deploymentEnvironmentAccessPoliciesQueryKey(appInstanceId),
]

export const deploymentAccessStateQueryKeys = (appInstanceId: string) => [
  deploymentOverviewQueryKey(appInstanceId),
  deploymentAccessConfigQueryKey(appInstanceId),
]

export const deploymentOverviewQueryOptions = (appInstanceId?: string) =>
  consoleQuery.enterprise.enterpriseAppDeployConsole.getAppInstanceOverview.queryOptions({
    input: appInstanceId
      ? { params: { appInstanceId } }
      : skipToken,
  })

export const deploymentEnvironmentDeploymentsQueryOptions = (appInstanceId?: string) =>
  consoleQuery.enterprise.enterpriseAppDeployConsole.listRuntimeInstances.queryOptions({
    input: appInstanceId
      ? { params: { appInstanceId } }
      : skipToken,
  })

export const deploymentReleaseHistoryQueryOptions = (appInstanceId?: string) =>
  consoleQuery.enterprise.enterpriseAppDeployConsole.listReleases.queryOptions({
    input: appInstanceId
      ? {
          params: { appInstanceId },
          query: {
            pageNumber: 1,
            resultsPerPage: DEPLOYMENT_PAGE_SIZE,
          },
        }
      : skipToken,
  })
