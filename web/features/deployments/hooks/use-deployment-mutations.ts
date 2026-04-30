'use client'

import type {
  CreateDeploymentParams,
  CreateInstanceParams,
  DeploymentAppData,
  UpdateInstanceParams,
} from '../data'
import type { AccessSubject, ConsoleReleaseSummary } from '@/contract/console/deployments'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { consoleQuery } from '@/service/client'
import {
  cancelDeployment,
  createApiKey,
  createAppInstance,
  createDeployment,
  deleteApiKey,
  deleteAppInstance,
  deploymentAppDataQueryKey,
  patchAccessChannel,
  patchDeveloperAPI,
  refreshDeploymentAppDataWhenReady,
  undeployEnvironment,
  updateAppInstance,
  updateEnvironmentAccessPolicy,
  waitForAppInstanceInDeploymentList,
} from '../data'

export type CreateDeploymentInstanceResult = {
  appInstanceId: string
  initialRelease?: ConsoleReleaseSummary
  appData?: DeploymentAppData
}

type UpdateDeploymentInstanceParams = {
  appId: string
} & UpdateInstanceParams

type UndeployDeploymentParams = {
  appId: string
  runtimeInstanceId?: string
  isDeploying?: boolean
}

type GenerateApiKeyParams = {
  appId: string
  environmentId: string
}

type RevokeApiKeyParams = GenerateApiKeyParams & {
  apiKeyId: string
}

type ToggleAccessChannelParams = {
  appId: string
  channel: string
  enabled: boolean
}

type SetEnvironmentAccessPolicyParams = {
  appId: string
  environmentId: string
  accessMode: string
  subjects: AccessSubject[]
}

const createApiKeyLabel = (
  appData: DeploymentAppData | undefined,
  environmentId: string,
) => {
  const existingCount = appData?.accessConfig.developerApi?.apiKeys?.filter(key =>
    (key.environmentId ?? key.environment?.id) === environmentId,
  ).length ?? 0
  const environmentName = appData
    ?.environmentDeployments
    .data
    ?.find(row => row.environment?.id === environmentId)
    ?.environment
    ?.name ?? 'env'

  return `${environmentName}-key-${String(existingCount + 1).padStart(3, '0')}`
}

export const useCreateDeploymentInstance = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.createInstance.mutationKey(),
    mutationFn: async (params: CreateInstanceParams): Promise<CreateDeploymentInstanceResult> => {
      const response = await createAppInstance(params)
      if (!response.appInstanceId)
        throw new Error('Create app instance did not return an appInstanceId.')

      const [appData] = await Promise.all([
        refreshDeploymentAppDataWhenReady(response.appInstanceId).catch(() => undefined),
        waitForAppInstanceInDeploymentList(response.appInstanceId).catch(() => undefined),
      ])

      return {
        appInstanceId: response.appInstanceId,
        initialRelease: response.initialRelease,
        appData,
      }
    },
    onSuccess: async (result) => {
      if (result.appData) {
        queryClient.setQueryData(
          deploymentAppDataQueryKey(result.appInstanceId),
          result.appData,
        )
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: consoleQuery.deployments.list.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: deploymentAppDataQueryKey(result.appInstanceId),
        }),
      ])
    },
  })
}

export const useUpdateDeploymentInstance = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.updateInstance.mutationKey(),
    mutationFn: ({ appId, ...patch }: UpdateDeploymentInstanceParams) =>
      updateAppInstance(appId, patch),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: consoleQuery.deployments.list.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: deploymentAppDataQueryKey(variables.appId),
        }),
        queryClient.invalidateQueries({
          queryKey: consoleQuery.deployments.settings.queryKey({
            input: {
              params: {
                appInstanceId: variables.appId,
              },
            },
          }),
        }),
      ])
    },
  })
}

export const useDeleteDeploymentInstance = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.deleteInstance.mutationKey(),
    mutationFn: (appId: string) => deleteAppInstance(appId),
    onSuccess: async (_data, appId) => {
      queryClient.removeQueries({
        queryKey: deploymentAppDataQueryKey(appId),
      })
      queryClient.removeQueries({
        queryKey: consoleQuery.deployments.settings.queryKey({
          input: {
            params: {
              appInstanceId: appId,
            },
          },
        }),
      })
      await queryClient.invalidateQueries({
        queryKey: consoleQuery.deployments.list.key(),
      })
    },
  })
}

export const useStartDeployment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.createDeployment.mutationKey(),
    mutationFn: (params: CreateDeploymentParams) => createDeployment(params),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: consoleQuery.deployments.list.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: deploymentAppDataQueryKey(variables.appId),
        }),
      ])
    },
  })
}

export const useUndeployDeployment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.undeployEnvironment.mutationKey(),
    mutationFn: ({ appId, runtimeInstanceId, isDeploying }: UndeployDeploymentParams) => {
      if (!runtimeInstanceId)
        return Promise.resolve(undefined)
      if (isDeploying)
        return cancelDeployment(appId, runtimeInstanceId)
      return undeployEnvironment(appId, runtimeInstanceId)
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: consoleQuery.deployments.list.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: deploymentAppDataQueryKey(variables.appId),
        }),
      ])
    },
  })
}

export const useGenerateDeploymentApiKey = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.createEnvironmentAPIToken.mutationKey(),
    mutationFn: ({ appId, environmentId }: GenerateApiKeyParams) => {
      const appData = queryClient.getQueryData<DeploymentAppData>(
        deploymentAppDataQueryKey(appId),
      )

      return createApiKey(appId, environmentId, createApiKeyLabel(appData, environmentId))
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: consoleQuery.deployments.list.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: deploymentAppDataQueryKey(variables.appId),
        }),
      ])
    },
  })
}

export const useRevokeDeploymentApiKey = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.deleteEnvironmentAPIToken.mutationKey(),
    mutationFn: ({ appId, apiKeyId }: RevokeApiKeyParams) => deleteApiKey(appId, apiKeyId),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: consoleQuery.deployments.list.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: deploymentAppDataQueryKey(variables.appId),
        }),
      ])
    },
  })
}

export const useToggleDeploymentAccessChannel = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.patchAccessChannel.mutationKey(),
    mutationFn: ({ appId, channel, enabled }: ToggleAccessChannelParams) => {
      if (channel === 'api')
        return patchDeveloperAPI(appId, enabled)
      return patchAccessChannel(appId, enabled)
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: consoleQuery.deployments.list.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: deploymentAppDataQueryKey(variables.appId),
        }),
      ])
    },
  })
}

export const useSetEnvironmentAccessPolicy = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.updateEnvironmentAccessPolicy.mutationKey(),
    mutationFn: ({
      appId,
      environmentId,
      accessMode,
      subjects,
    }: SetEnvironmentAccessPolicyParams) =>
      updateEnvironmentAccessPolicy(appId, environmentId, accessMode, subjects),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: consoleQuery.deployments.list.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: deploymentAppDataQueryKey(variables.appId),
        }),
        queryClient.invalidateQueries({
          queryKey: consoleQuery.deployments.environmentAccessPolicy.queryKey({
            input: {
              params: {
                appInstanceId: variables.appId,
                environmentId: variables.environmentId,
              },
            },
          }),
        }),
      ])
    },
  })
}
