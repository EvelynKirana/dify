'use client'
import type { AppInfo, AppMode } from '../types'
import type { AppDeploymentSummary, EnvironmentOption } from '@/contract/console/deployments'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { consoleQuery } from '@/service/client'
import { useDeploymentsStore } from '../store'

const MAX_SOURCE_APPS = 100

function toAppInfo(summary: AppDeploymentSummary): AppInfo | undefined {
  if (!summary.id || !summary.name)
    return undefined

  return {
    id: summary.id,
    name: summary.name,
    mode: (summary.mode || 'workflow') as AppMode,
    iconType: 'emoji',
    icon: summary.icon,
    description: summary.description ?? undefined,
    sourceAppId: summary.sourceAppId,
    sourceAppName: summary.sourceAppName,
  }
}

type UseSourceAppsOptions = {
  enabled?: boolean
  environmentId?: string
  keyword?: string
  notDeployed?: boolean
}

export function useSourceApps(options: UseSourceAppsOptions = {}) {
  const { enabled = true, environmentId, keyword, notDeployed } = options
  const seedInstancesFromApps = useDeploymentsStore(state => state.seedInstancesFromApps)

  const query = useMemo(() => ({
    pageNumber: 1,
    resultsPerPage: MAX_SOURCE_APPS,
    ...(environmentId ? { environmentId } : {}),
    ...(notDeployed ? { notDeployed: true } : {}),
    ...(keyword?.trim() ? { query: keyword.trim() } : {}),
  }), [environmentId, keyword, notDeployed])

  const listQuery = useQuery(consoleQuery.deployments.list.queryOptions({
    input: { query },
    enabled,
    staleTime: 30 * 1000,
  }))

  const apps = useMemo<AppInfo[]>(() => {
    return (listQuery.data?.data ?? [])
      .map(toAppInfo)
      .filter((app): app is AppInfo => Boolean(app))
  }, [listQuery.data?.data])

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

  useEffect(() => {
    if (!enabled || listQuery.isLoading)
      return
    seedInstancesFromApps(apps)
  }, [apps, enabled, listQuery.isLoading, seedInstancesFromApps])

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
