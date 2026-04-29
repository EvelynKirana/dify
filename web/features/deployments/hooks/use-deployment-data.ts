'use client'

import type { AppInfo } from '../types'
import { useQueries } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { deploymentAppDataQueryOptions } from '@/service/deployments'
import { useDeploymentsStore } from '../store'

type UseDeploymentDataOptions = {
  enabled?: boolean
}

export function useDeploymentData(apps: AppInfo[], options: UseDeploymentDataOptions = {}) {
  const { enabled = true } = options
  const applyAppData = useDeploymentsStore(state => state.applyAppData)

  const queries = useQueries({
    queries: apps.map(app => ({
      ...deploymentAppDataQueryOptions(app.id),
      enabled: enabled && Boolean(app.id),
    })),
  })

  const queriesRef = useRef(queries)
  queriesRef.current = queries
  const dataUpdatedAt = queries.map(query => query.dataUpdatedAt).join('|')

  useEffect(() => {
    queriesRef.current.forEach((query) => {
      if (query.data)
        applyAppData(query.data)
    })
  }, [applyAppData, dataUpdatedAt])

  return {
    isLoading: queries.some(query => query.isLoading),
    isFetching: queries.some(query => query.isFetching),
    isError: queries.some(query => query.isError),
  }
}
