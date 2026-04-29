'use client'

import type { AppInfo } from '../types'
import { useQueries } from '@tanstack/react-query'
import { deploymentAppDataQueryOptions } from '../data'
import { useDeploymentsStore } from '../store'

type UseDeploymentDataOptions = {
  enabled?: boolean
}

export function useDeploymentData(apps: AppInfo[], options: UseDeploymentDataOptions = {}) {
  const { enabled = true } = options

  const queries = useQueries({
    queries: apps.map(app => ({
      ...deploymentAppDataQueryOptions(app.id),
      queryFn: () => useDeploymentsStore.getState().fetchAppData(app.id),
      enabled: enabled && Boolean(app.id),
    })),
  })

  return {
    isLoading: queries.some(query => query.isLoading),
    isFetching: queries.some(query => query.isFetching),
    isError: queries.some(query => query.isError),
  }
}
