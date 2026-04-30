import type { ListAppDeploymentsQuery } from '@/contract/console/deployments'
import { skipToken } from '@tanstack/react-query'
import { consoleQuery } from '@/service/client'
import { DEPLOYMENT_PAGE_SIZE, SOURCE_APPS_PAGE_SIZE } from './data'

export const deploymentsListQueryOptions = (query: ListAppDeploymentsQuery = {}) =>
  consoleQuery.deployments.list.queryOptions({
    input: {
      query: {
        pageNumber: 1,
        resultsPerPage: SOURCE_APPS_PAGE_SIZE,
        ...query,
      },
    },
  })

export const deploymentOverviewQueryOptions = (appInstanceId?: string) =>
  consoleQuery.deployments.overview.queryOptions({
    input: appInstanceId
      ? { params: { appInstanceId } }
      : skipToken,
  })

export const deploymentEnvironmentDeploymentsQueryOptions = (appInstanceId?: string) =>
  consoleQuery.deployments.environmentDeployments.queryOptions({
    input: appInstanceId
      ? { params: { appInstanceId } }
      : skipToken,
  })

export const deploymentReleaseHistoryQueryOptions = (appInstanceId?: string) =>
  consoleQuery.deployments.releaseHistory.queryOptions({
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
