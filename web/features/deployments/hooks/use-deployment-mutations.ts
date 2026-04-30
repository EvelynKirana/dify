'use client'

import type { QueryClient, QueryKey } from '@tanstack/react-query'
import type { ConsoleReleaseSummary } from '@/contract/console/deployments'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { consoleClient, consoleQuery } from '@/service/client'
import { DEPLOYMENT_PAGE_SIZE } from '../data'
import {
  deploymentAccessConfigQueryKey,
  deploymentAccessStateQueryKeys,
  deploymentEnvironmentAccessPolicyQueryKeyForEnvironment,
  deploymentInstanceDetailQueryKeys,
  deploymentInstanceIdentityQueryKeys,
  deploymentInstanceStateQueryKeys,
  deploymentReleaseHistoryQueryKey,
  deploymentsListQueryKey,
} from '../queries'

export type CreateDeploymentInstanceResult = {
  appInstanceId: string
  initialRelease?: ConsoleReleaseSummary
}

type CreateDeploymentParams = {
  appId: string
  environmentId: string
  releaseId?: string
  releaseNote?: string
}

type CreateInstanceParams = {
  sourceAppId: string
  name: string
  description?: string
}

type UndeployDeploymentParams = {
  appId: string
  runtimeInstanceId: string
  isDeploying?: boolean
}

const DEPLOYMENT_READINESS_RETRY_DELAYS = [0, 300, 700, 1200]

const wait = (delay: number) => new Promise(resolve => setTimeout(resolve, delay))

const invalidateQueries = async (queryClient: QueryClient, queryKeys: readonly QueryKey[]): Promise<void> => {
  await Promise.all(queryKeys.map(queryKey => queryClient.invalidateQueries({ queryKey })))
}

const removeQueries = (queryClient: QueryClient, queryKeys: readonly QueryKey[]): void => {
  queryKeys.forEach(queryKey => queryClient.removeQueries({ queryKey }))
}

const invalidateInstanceList = (queryClient: QueryClient): Promise<void> => {
  return queryClient.invalidateQueries({
    queryKey: deploymentsListQueryKey(),
  })
}

const invalidateInstanceIdentity = (queryClient: QueryClient, appInstanceId: string): Promise<void> => {
  return invalidateQueries(queryClient, deploymentInstanceIdentityQueryKeys(appInstanceId))
}

const invalidateDeploymentState = (queryClient: QueryClient, appInstanceId: string): Promise<void> => {
  return invalidateQueries(queryClient, deploymentInstanceStateQueryKeys(appInstanceId))
}

const invalidateAccessState = (queryClient: QueryClient, appInstanceId: string): Promise<void> => {
  return invalidateQueries(queryClient, deploymentAccessStateQueryKeys(appInstanceId))
}

const invalidateEnvironmentAccessPolicy = (
  queryClient: QueryClient,
  appInstanceId: string,
  environmentId: string,
): Promise<void> => {
  return invalidateQueries(queryClient, [
    deploymentAccessConfigQueryKey(appInstanceId),
    deploymentEnvironmentAccessPolicyQueryKeyForEnvironment(appInstanceId, environmentId),
  ])
}

const removeDeletedInstanceState = (queryClient: QueryClient, appInstanceId: string): Promise<void> => {
  removeQueries(queryClient, deploymentInstanceDetailQueryKeys(appInstanceId))
  return invalidateInstanceList(queryClient)
}

export const useCreateDeploymentInstance = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.createInstance.mutationKey(),
    mutationFn: async (params: CreateInstanceParams): Promise<CreateDeploymentInstanceResult> => {
      const response = await consoleClient.deployments.createInstance({
        body: {
          sourceAppId: params.sourceAppId,
          name: params.name,
          description: params.description,
        },
      })
      if (!response.appInstanceId)
        throw new Error('Create app instance did not return an appInstanceId.')

      for (const delay of DEPLOYMENT_READINESS_RETRY_DELAYS) {
        if (delay > 0)
          await wait(delay)

        const listResponse = await consoleClient.deployments.list({
          query: {
            pageNumber: 1,
            resultsPerPage: DEPLOYMENT_PAGE_SIZE,
          },
        }).catch(() => undefined)
        if (listResponse?.data?.some(app => app.id === response.appInstanceId))
          break
      }

      return {
        appInstanceId: response.appInstanceId,
        initialRelease: response.initialRelease,
      }
    },
    onSuccess: () => {
      return invalidateInstanceList(queryClient)
    },
  })
}

export const useUpdateDeploymentInstance = () => {
  const queryClient = useQueryClient()

  return useMutation(consoleQuery.deployments.updateInstance.mutationOptions({
    onSuccess: (_data, variables) => {
      return invalidateInstanceIdentity(queryClient, variables.params.appInstanceId)
    },
  }))
}

export const useDeleteDeploymentInstance = () => {
  const queryClient = useQueryClient()

  return useMutation(consoleQuery.deployments.deleteInstance.mutationOptions({
    onSuccess: (_data, variables) => {
      return removeDeletedInstanceState(queryClient, variables.params.appInstanceId)
    },
  }))
}

export const useStartDeployment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.createDeployment.mutationKey(),
    mutationFn: async ({
      appId,
      environmentId,
      releaseId,
      releaseNote,
    }: CreateDeploymentParams) => {
      let targetReleaseId = releaseId
      let releaseWasCreated = false
      await consoleClient.deployments.previewRelease({
        params: {
          appInstanceId: appId,
        },
        body: {
          releaseId: targetReleaseId,
        },
      })

      try {
        if (!targetReleaseId) {
          const trimmedReleaseNote = releaseNote?.trim()
          const response = await consoleClient.deployments.createRelease({
            params: {
              appInstanceId: appId,
            },
            body: {
              name: trimmedReleaseNote || 'Release',
              description: trimmedReleaseNote || undefined,
            },
          })
          releaseWasCreated = true
          if (!response.release)
            throw new Error('Create release did not return a release.')
          targetReleaseId = response.release.id
        }

        if (!targetReleaseId)
          throw new Error('Failed to create a deployable release.')

        return await consoleClient.deployments.createDeployment({
          params: {
            appInstanceId: appId,
          },
          body: {
            environmentId,
            releaseId: targetReleaseId,
          },
        })
      }
      catch (error) {
        if (releaseWasCreated) {
          await queryClient.invalidateQueries({
            queryKey: deploymentReleaseHistoryQueryKey(appId),
          })
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      return invalidateDeploymentState(queryClient, variables.appId)
    },
  })
}

export const useUndeployDeployment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.undeployEnvironment.mutationKey(),
    mutationFn: ({ appId, runtimeInstanceId, isDeploying }: UndeployDeploymentParams) => {
      if (!runtimeInstanceId)
        throw new Error('runtimeInstanceId is required to undeploy a deployment.')
      if (isDeploying) {
        return consoleClient.deployments.cancelDeployment({
          params: {
            appInstanceId: appId,
            runtimeInstanceId,
          },
        })
      }
      return consoleClient.deployments.undeployEnvironment({
        params: {
          appInstanceId: appId,
          runtimeInstanceId,
        },
      })
    },
    onSuccess: (_data, variables) => {
      return invalidateDeploymentState(queryClient, variables.appId)
    },
  })
}

export const useGenerateDeploymentApiKey = () => {
  const queryClient = useQueryClient()

  return useMutation(consoleQuery.deployments.createEnvironmentAPIToken.mutationOptions({
    onSuccess: (_data, variables) => {
      return invalidateAccessState(queryClient, variables.params.appInstanceId)
    },
  }))
}

export const useRevokeDeploymentApiKey = () => {
  const queryClient = useQueryClient()

  return useMutation(consoleQuery.deployments.deleteEnvironmentAPIToken.mutationOptions({
    onSuccess: (_data, variables) => {
      return invalidateAccessState(queryClient, variables.params.appInstanceId)
    },
  }))
}

export const useToggleDeploymentAccessChannel = () => {
  const queryClient = useQueryClient()

  return useMutation(consoleQuery.deployments.patchAccessChannel.mutationOptions({
    onSuccess: (_data, variables) => {
      return invalidateAccessState(queryClient, variables.params.appInstanceId)
    },
  }))
}

export const useToggleDeploymentDeveloperAPI = () => {
  const queryClient = useQueryClient()

  return useMutation(consoleQuery.deployments.patchDeveloperAPI.mutationOptions({
    onSuccess: (_data, variables) => {
      return invalidateAccessState(queryClient, variables.params.appInstanceId)
    },
  }))
}

export const useSetEnvironmentAccessPolicy = () => {
  const queryClient = useQueryClient()

  return useMutation(consoleQuery.deployments.updateEnvironmentAccessPolicy.mutationOptions({
    onSuccess: (_data, variables) => {
      return invalidateEnvironmentAccessPolicy(
        queryClient,
        variables.params.appInstanceId,
        variables.params.environmentId,
      )
    },
  }))
}
