'use client'

import type {
  AccessSubject,
  ConsoleReleaseSummary,
} from '@/contract/console/deployments'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { consoleClient, consoleQuery } from '@/service/client'
import { DEPLOYMENT_PAGE_SIZE } from '../data'

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

type UpdateInstanceParams = {
  name: string
  description?: string
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
  name: string
}

type RevokeApiKeyParams = {
  appId: string
  environmentId: string
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

const DEPLOYMENT_READINESS_RETRY_DELAYS = [0, 300, 700, 1200]

const wait = (delay: number) => new Promise(resolve => setTimeout(resolve, delay))

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
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: consoleQuery.deployments.key(),
      })
    },
  })
}

export const useUpdateDeploymentInstance = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.updateInstance.mutationKey(),
    mutationFn: ({ appId, ...patch }: UpdateDeploymentInstanceParams) =>
      consoleClient.deployments.updateInstance({
        params: {
          appInstanceId: appId,
        },
        body: {
          name: patch.name,
          description: patch.description,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: consoleQuery.deployments.key(),
      })
    },
  })
}

export const useDeleteDeploymentInstance = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.deleteInstance.mutationKey(),
    mutationFn: (appId: string) => consoleClient.deployments.deleteInstance({
      params: {
        appInstanceId: appId,
      },
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: consoleQuery.deployments.key(),
      })
    },
  })
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
      await consoleClient.deployments.previewRelease({
        params: {
          appInstanceId: appId,
        },
        body: {
          releaseId: targetReleaseId,
        },
      })

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
        if (!response.release)
          throw new Error('Create release did not return a release.')
        targetReleaseId = response.release.id
      }

      if (!targetReleaseId)
        throw new Error('Failed to create a deployable release.')

      return consoleClient.deployments.createDeployment({
        params: {
          appInstanceId: appId,
        },
        body: {
          environmentId,
          releaseId: targetReleaseId,
        },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: consoleQuery.deployments.key(),
      })
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: consoleQuery.deployments.key(),
      })
    },
  })
}

export const useGenerateDeploymentApiKey = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.createEnvironmentAPIToken.mutationKey(),
    mutationFn: ({ appId, environmentId, name }: GenerateApiKeyParams) =>
      consoleClient.deployments.createEnvironmentAPIToken({
        params: {
          appInstanceId: appId,
        },
        body: {
          environmentId,
          name,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: consoleQuery.deployments.key(),
      })
    },
  })
}

export const useRevokeDeploymentApiKey = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.deleteEnvironmentAPIToken.mutationKey(),
    mutationFn: ({ appId, apiKeyId }: RevokeApiKeyParams) => consoleClient.deployments.deleteEnvironmentAPIToken({
      params: {
        appInstanceId: appId,
        apiKeyId,
      },
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: consoleQuery.deployments.key(),
      })
    },
  })
}

export const useToggleDeploymentAccessChannel = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: consoleQuery.deployments.patchAccessChannel.mutationKey(),
    mutationFn: ({ appId, channel, enabled }: ToggleAccessChannelParams) => {
      if (channel === 'api') {
        return consoleClient.deployments.patchDeveloperAPI({
          params: {
            appInstanceId: appId,
          },
          body: {
            enabled,
          },
        })
      }
      return consoleClient.deployments.patchAccessChannel({
        params: {
          appInstanceId: appId,
        },
        body: {
          enabled,
        },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: consoleQuery.deployments.key(),
      })
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
    }: SetEnvironmentAccessPolicyParams) => consoleClient.deployments.updateEnvironmentAccessPolicy({
      params: {
        appInstanceId: appId,
        environmentId,
      },
      body: {
        accessMode,
        subjects,
      },
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: consoleQuery.deployments.key(),
      })
    },
  })
}
