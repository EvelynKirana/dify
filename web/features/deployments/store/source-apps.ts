import type { ListAppDeploymentsQuery } from '../data'
import type {
  AppDeploymentSummary,
  EnvironmentOption,
  ListAppDeploymentsReply,
} from '@/contract/console/deployments'

export type SourceAppsList = {
  appIds: string[]
  summaries: Record<string, AppDeploymentSummary>
  environmentOptions: EnvironmentOption[]
}

export const emptySourceAppsList: SourceAppsList = {
  appIds: [],
  summaries: {},
  environmentOptions: [],
}

export const sourceAppsListKey = ({
  environmentId = '',
  notDeployed = false,
  pageNumber = 1,
  query = '',
  resultsPerPage = 100,
}: ListAppDeploymentsQuery) => {
  return [
    environmentId,
    notDeployed ? 'not-deployed' : 'all',
    pageNumber,
    resultsPerPage,
    query.trim(),
  ].join('|')
}

export const toSourceAppsList = (response: ListAppDeploymentsReply): SourceAppsList => {
  const summaries = Object.fromEntries(
    (response.data ?? [])
      .filter(summary => summary.id)
      .map(summary => [summary.id!, summary]),
  )

  return {
    appIds: Object.keys(summaries),
    summaries,
    environmentOptions: response.filters
      ?.filter(filter => filter.kind === 'environment' && filter.id)
      .map(filter => ({
        id: filter.id,
        name: filter.name,
      })) ?? [],
  }
}
