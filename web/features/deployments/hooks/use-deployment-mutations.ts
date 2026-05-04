'use client'

import type { DeploymentRuntimeBinding } from '@dify/contracts/enterprise/types.gen'
import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { consoleClient, consoleQuery } from '@/service/client'
import {
  deploymentAccessConfigQueryKey,
  deploymentAccessStateQueryKeys,
  deploymentEnvironmentAccessPolicyQueryKeyForEnvironment,
  deploymentInstanceDetailQueryKeys,
  deploymentInstanceIdentityQueryKeys,
  deploymentInstanceStateQueryKeys,
  deploymentOverviewQueryKey,
  deploymentReleaseHistoryQueryKey,
  deploymentsListQueryKey,
  deploymentsListQueryOptions,
} from '../queries'

export type CreateDeploymentInstanceResult = {
  appInstanceId: string
}

type CreateDeploymentParams = {
  appInstanceId: string
  environmentId: string
  releaseId: string
  bindings: DeploymentRuntimeBinding[]
}

type CreateReleaseParams = {
  appInstanceId: string
  name: string
  description?: string
}

type CreateInstanceParams = {
  sourceAppId: string
  name: string
  description?: string
}

type UndeployDeploymentParams = {
  appInstanceId: string
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
    mutationKey: consoleQuery.enterprise.appDeploy.createAppInstance.mutationKey(),
    mutationFn: async (params: CreateInstanceParams): Promise<CreateDeploymentInstanceResult> => {
      const response = await consoleClient.enterprise.appDeploy.createAppInstance({
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

        const listResponse = await queryClient.fetchQuery(deploymentsListQueryOptions()).catch(() => undefined)
        if (listResponse?.data?.some(app => app.id === response.appInstanceId))
          break
      }

      return {
        appInstanceId: response.appInstanceId,
      }
    },
    onSuccess: () => {
      return invalidateInstanceList(queryClient)
    },
  })
}

export const useCreateDeploymentRelease = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.enterprise.appDeploy.createRelease.mutationKey(),
    mutationFn: async ({ appInstanceId, name, description }: CreateReleaseParams) => {
      const response = await consoleClient.enterprise.appDeploy.createRelease({
        params: {
          appInstanceId,
        },
        body: {
          name,
          description,
        },
      })
      if (!response.release?.id)
        throw new Error('Create release did not return a release.')

      return response.release
    },
    onSuccess: (_data, variables) => {
      return invalidateQueries(queryClient, [
        deploymentReleaseHistoryQueryKey(variables.appInstanceId),
        deploymentOverviewQueryKey(variables.appInstanceId),
      ])
    },
  })
}

export const useUpdateDeploymentInstance = () => {
  const queryClient = useQueryClient()

  return useMutation(consoleQuery.enterprise.appDeploy.updateAppInstance.mutationOptions({
    onSuccess: (_data, variables) => {
      return invalidateInstanceIdentity(queryClient, variables.params.appInstanceId)
    },
  }))
}

export const useDeleteDeploymentInstance = () => {
  const queryClient = useQueryClient()

  return useMutation(consoleQuery.enterprise.appDeploy.deleteAppInstance.mutationOptions({
    onSuccess: (_data, variables) => {
      return removeDeletedInstanceState(queryClient, variables.params.appInstanceId)
    },
  }))
}

export const useStartDeployment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.enterprise.appDeploy.createDeployment.mutationKey(),
    mutationFn: async ({
      appInstanceId,
      environmentId,
      releaseId,
      bindings,
    }: CreateDeploymentParams) => {
      if (!releaseId)
        throw new Error('releaseId is required to start a deployment.')

      return consoleClient.enterprise.appDeploy.createDeployment({
        params: {
          appInstanceId,
        },
        body: {
          environmentId,
          releaseId,
          bindings,
        },
      })
    },
    onSuccess: (_data, variables) => {
      return invalidateDeploymentState(queryClient, variables.appInstanceId)
    },
  })
}

export const useUndeployDeployment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.enterprise.appDeploy.undeployRuntimeInstance.mutationKey(),
    mutationFn: ({ appInstanceId, runtimeInstanceId, isDeploying }: UndeployDeploymentParams) => {
      if (!runtimeInstanceId)
        throw new Error('runtimeInstanceId is required to undeploy a deployment.')
      if (isDeploying) {
        return consoleClient.enterprise.appDeploy.cancelRuntimeDeployment({
          params: {
            appInstanceId,
            runtimeInstanceId,
          },
          body: {
            appInstanceId,
            runtimeInstanceId,
          },
        })
      }
      return consoleClient.enterprise.appDeploy.undeployRuntimeInstance({
        params: {
          appInstanceId,
          runtimeInstanceId,
        },
        body: {
          appInstanceId,
          runtimeInstanceId,
        },
      })
    },
    onSuccess: (_data, variables) => {
      return invalidateDeploymentState(queryClient, variables.appInstanceId)
    },
  })
}

export const useGenerateDeploymentApiKey = () => {
  const queryClient = useQueryClient()

  return useMutation(consoleQuery.enterprise.appDeploy.createDeveloperApiKey.mutationOptions({
    onSuccess: (_data, variables) => {
      return invalidateAccessState(queryClient, variables.params.appInstanceId)
    },
  }))
}

export const useRevokeDeploymentApiKey = () => {
  const queryClient = useQueryClient()

  return useMutation(consoleQuery.enterprise.appDeploy.deleteDeveloperApiKey.mutationOptions({
    onSuccess: (_data, variables) => {
      return invalidateAccessState(queryClient, variables.params.appInstanceId)
    },
  }))
}

export const useToggleDeploymentAccessChannel = () => {
  const queryClient = useQueryClient()

  return useMutation(consoleQuery.enterprise.appDeploy.updateAccessChannels.mutationOptions({
    onSuccess: (_data, variables) => {
      return invalidateAccessState(queryClient, variables.params.appInstanceId)
    },
  }))
}

export const useToggleDeploymentDeveloperAPI = () => {
  const queryClient = useQueryClient()

  return useMutation(consoleQuery.enterprise.appDeploy.updateDeveloperApi.mutationOptions({
    onSuccess: (_data, variables) => {
      return invalidateAccessState(queryClient, variables.params.appInstanceId)
    },
  }))
}

export const useSetEnvironmentAccessPolicy = () => {
  const queryClient = useQueryClient()

  return useMutation(consoleQuery.enterprise.appDeploy.updateEnvironmentAccessPolicy.mutationOptions({
    onSuccess: (_data, variables) => {
      return invalidateEnvironmentAccessPolicy(
        queryClient,
        variables.params.appInstanceId,
        variables.params.environmentId,
      )
    },
  }))
}
