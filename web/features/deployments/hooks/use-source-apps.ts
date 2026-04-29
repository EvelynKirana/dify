'use client'
import type { AppInfo } from '../types'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { consoleQuery } from '@/service/client'
import { useDeploymentsStore } from '../store'
import { deploymentsSelectors } from '../store/selectors'

const MAX_SOURCE_APPS = 100

type UseSourceAppsOptions = {
  enabled?: boolean
  environmentId?: string
  keyword?: string
  notDeployed?: boolean
}

export function useSourceApps(options: UseSourceAppsOptions = {}) {
  const { enabled = true, environmentId, keyword, notDeployed } = options
  const instancesById = useDeploymentsStore(deploymentsSelectors.instancesById)
  const listRefreshToken = useDeploymentsStore(deploymentsSelectors.listRefreshToken)
  const query = useMemo(() => ({
    pageNumber: 1,
    resultsPerPage: MAX_SOURCE_APPS,
    ...(environmentId ? { environmentId } : {}),
    ...(notDeployed ? { notDeployed: true } : {}),
    ...(keyword?.trim() ? { query: keyword.trim() } : {}),
  }), [environmentId, keyword, notDeployed])
  const sourceAppsList = useDeploymentsStore(deploymentsSelectors.sourceAppsList(query))

  const listQueryOptions = consoleQuery.deployments.list.queryOptions({
    input: { query },
    enabled,
    staleTime: 30 * 1000,
  })

  const listQuery = useQuery({
    ...listQueryOptions,
    queryKey: [
      ...consoleQuery.deployments.list.queryKey({ input: { query } }),
      listRefreshToken,
    ],
    queryFn: () => useDeploymentsStore.getState().fetchSourceApps(query),
  })

  const apps = useMemo<AppInfo[]>(() => {
    return sourceAppsList.appIds
      .map(id => instancesById[id])
      .filter((app): app is AppInfo => Boolean(app))
  }, [sourceAppsList.appIds, instancesById])

  const appMap = useMemo<Map<string, AppInfo>>(() => {
    return new Map(apps.map(a => [a.id, a]))
  }, [apps])

  return {
    apps,
    appMap,
    summaries: sourceAppsList.summaries,
    environmentOptions: sourceAppsList.environmentOptions,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    isError: listQuery.isError,
    isEmpty: !listQuery.isLoading && apps.length === 0,
  }
}
