'use client'
import type { AppInfo } from '../types'
import type { AppDeploymentSummary, EnvironmentOption } from '@/contract/console/deployments'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { consoleQuery } from '@/service/client'
import { useDeploymentsStore } from '../store'

const MAX_SOURCE_APPS = 100

type UseSourceAppsOptions = {
  enabled?: boolean
  environmentId?: string
  keyword?: string
  notDeployed?: boolean
}

export function useSourceApps(options: UseSourceAppsOptions = {}) {
  const { enabled = true, environmentId, keyword, notDeployed } = options
  const instancesById = useDeploymentsStore(state => state.instancesById)

  const query = useMemo(() => ({
    pageNumber: 1,
    resultsPerPage: MAX_SOURCE_APPS,
    ...(environmentId ? { environmentId } : {}),
    ...(notDeployed ? { notDeployed: true } : {}),
    ...(keyword?.trim() ? { query: keyword.trim() } : {}),
  }), [environmentId, keyword, notDeployed])

  const listQuery = useQuery(consoleQuery.deployments.list.queryOptions({
    input: { query },
    queryFn: () => useDeploymentsStore.getState().fetchSourceApps(query),
    enabled,
    staleTime: 30 * 1000,
  }))

  const appIds = useMemo(() => {
    return (listQuery.data?.data ?? [])
      .map(summary => summary.id)
      .filter((id): id is string => Boolean(id))
  }, [listQuery.data?.data])

  const apps = useMemo<AppInfo[]>(() => {
    return appIds
      .map(id => instancesById[id])
      .filter((app): app is AppInfo => Boolean(app))
  }, [appIds, instancesById])

  const appMap = useMemo<Map<string, AppInfo>>(() => {
    return new Map(apps.map(a => [a.id, a]))
  }, [apps])

  const summaries = useMemo<Record<string, AppDeploymentSummary>>(() => {
    return Object.fromEntries(
      (listQuery.data?.data ?? [])
        .filter(summary => summary.id)
        .map(summary => [summary.id!, summary]),
    )
  }, [listQuery.data?.data])

  const environmentOptions = useMemo<EnvironmentOption[]>(() => {
    return listQuery.data?.filters
      ?.filter(filter => filter.kind === 'environment' && filter.id)
      .map(filter => ({
        id: filter.id,
        name: filter.name,
      })) ?? []
  }, [listQuery.data?.filters])

  return {
    apps,
    appMap,
    summaries,
    environmentOptions,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    isError: listQuery.isError,
    isEmpty: !listQuery.isLoading && apps.length === 0,
  }
}
