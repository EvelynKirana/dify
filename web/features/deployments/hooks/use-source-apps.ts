'use client'
import type { AppInfo, AppMode } from '../types'
import type { AppDeploymentSummary, ConsoleAppSummary, EnvironmentOption } from '@/contract/console/deployments'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { consoleQuery } from '@/service/client'
import { useDeploymentsStore } from '../store'

const MAX_SOURCE_APPS = 100

function toAppInfo(app: ConsoleAppSummary): AppInfo | undefined {
  if (!app.id || !app.name)
    return undefined

  return {
    id: app.id,
    name: app.name,
    mode: (app.mode || 'workflow') as AppMode,
    iconType: 'emoji',
    icon: app.icon,
    description: app.description ?? undefined,
  }
}

type UseSourceAppsOptions = {
  enabled?: boolean
  environmentId?: string
  keyword?: string
}

export function useSourceApps(options: UseSourceAppsOptions = {}) {
  const { enabled = true, environmentId, keyword } = options
  const seedInstancesFromApps = useDeploymentsStore(state => state.seedInstancesFromApps)

  const query = useMemo(() => ({
    pageNumber: 1,
    resultsPerPage: MAX_SOURCE_APPS,
    ...(environmentId ? { environmentId } : {}),
    ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
  }), [environmentId, keyword])

  const listQuery = useQuery(consoleQuery.deployments.list.queryOptions({
    input: { query },
    enabled,
    staleTime: 30 * 1000,
  }))

  const apps = useMemo<AppInfo[]>(() => {
    return (listQuery.data?.data ?? [])
      .map(summary => summary.app ? toAppInfo(summary.app) : undefined)
      .filter((app): app is AppInfo => Boolean(app))
  }, [listQuery.data?.data])

  const appMap = useMemo<Map<string, AppInfo>>(() => {
    return new Map(apps.map(a => [a.id, a]))
  }, [apps])

  const summaries = useMemo<Record<string, AppDeploymentSummary>>(() => {
    return Object.fromEntries(
      (listQuery.data?.data ?? [])
        .filter(summary => summary.app?.id)
        .map(summary => [summary.app!.id!, summary]),
    )
  }, [listQuery.data?.data])

  const environmentOptions = useMemo<EnvironmentOption[]>(() => {
    return listQuery.data?.environmentOptions ?? []
  }, [listQuery.data?.environmentOptions])

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
