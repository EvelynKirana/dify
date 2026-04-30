'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  deploymentAppDataQueryOptions,
  toAppInfoFromOverview,
} from '../data'

type UseDeploymentDataOptions = {
  enabled?: boolean
}

export function useDeploymentAppData(appId?: string, options: UseDeploymentDataOptions = {}) {
  const { enabled = true } = options

  return useQuery({
    ...deploymentAppDataQueryOptions(appId ?? ''),
    enabled: enabled && Boolean(appId),
  })
}

export function useCachedDeploymentAppData(appId?: string) {
  return useQuery({
    ...deploymentAppDataQueryOptions(appId ?? ''),
    enabled: false,
  })
}

export function useDeploymentAppInfo(appId?: string, options: UseDeploymentDataOptions = {}) {
  const query = useDeploymentAppData(appId, options)
  const app = useMemo(
    () => toAppInfoFromOverview(query.data?.overview.instance),
    [query.data?.overview.instance],
  )

  return {
    ...query,
    data: app,
  }
}
