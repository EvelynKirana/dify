import type {
  AccessSubject,
  ConsoleReleaseSummary,
  CreateAppInstanceReply,
  GetAccessConfigReply,
  GetDeploymentOverviewReply,
  ListEnvironmentDeploymentsReply,
  ListReleaseHistoryReply,
} from '@/contract/console/deployments'
import { queryOptions } from '@tanstack/react-query'
import { getQueryClient } from '@/context/get-query-client'
import { consoleClient } from '@/service/client'

const DEPLOYMENT_PAGE_SIZE = 100
const DEPLOYMENT_APP_DATA_STALE_TIME = 30 * 1000

export type DeploymentAppData = {
  appId: string
  overview: GetDeploymentOverviewReply
  environmentDeployments: ListEnvironmentDeploymentsReply
  releaseHistory: ListReleaseHistoryReply
  accessConfig: GetAccessConfigReply
}

export type CreateDeploymentParams = {
  appId: string
  environmentId: string
  releaseId?: string
  releaseNote?: string
}

export type CreateInstanceParams = {
  sourceAppId: string
  name: string
  description?: string
}

export type UpdateInstanceParams = {
  name: string
  description?: string
}

export const deploymentAppDataQueryKey = (appId: string) => ['console', 'deployments', 'app-data', appId] as const

export const fetchDeploymentAppData = async (appId: string): Promise<DeploymentAppData> => {
  const input = { params: { appInstanceId: appId } }
  const [
    overview,
    environmentDeployments,
    releaseHistory,
    accessConfig,
  ] = await Promise.all([
    consoleClient.deployments.overview(input),
    consoleClient.deployments.environmentDeployments({
      ...input,
      query: {
        pageNumber: 1,
        resultsPerPage: DEPLOYMENT_PAGE_SIZE,
      },
    }),
    consoleClient.deployments.releaseHistory({
      ...input,
      query: {
        pageNumber: 1,
        resultsPerPage: DEPLOYMENT_PAGE_SIZE,
      },
    }),
    consoleClient.deployments.accessConfig(input),
  ])

  return {
    appId,
    overview,
    environmentDeployments,
    releaseHistory,
    accessConfig,
  }
}

export const deploymentAppDataQueryOptions = (appId: string) =>
  queryOptions<DeploymentAppData>({
    queryKey: deploymentAppDataQueryKey(appId),
    queryFn: () => fetchDeploymentAppData(appId),
    staleTime: DEPLOYMENT_APP_DATA_STALE_TIME,
  })

export const refreshDeploymentAppData = async (appId: string): Promise<DeploymentAppData> => {
  return getQueryClient().fetchQuery({
    ...deploymentAppDataQueryOptions(appId),
    staleTime: 0,
  })
}

export const createRelease = async (appId: string, releaseNote?: string): Promise<ConsoleReleaseSummary> => {
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
  return response.release
}

export const createDeployment = async ({
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
    const release = await createRelease(appId, releaseNote)
    targetReleaseId = release.id
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
}

export const cancelDeployment = async (appId: string, runtimeInstanceId: string) => {
  return consoleClient.deployments.cancelDeployment({
    params: {
      appInstanceId: appId,
      runtimeInstanceId,
    },
  })
}

export const undeployEnvironment = async (appId: string, runtimeInstanceId: string) => {
  return consoleClient.deployments.undeployEnvironment({
    params: {
      appInstanceId: appId,
      runtimeInstanceId,
    },
  })
}

export const createApiKey = async (appId: string, environmentId: string, name: string) => {
  return consoleClient.deployments.createEnvironmentAPIToken({
    params: {
      appInstanceId: appId,
    },
    body: {
      environmentId,
      name,
    },
  })
}

export const deleteApiKey = async (appId: string, apiKeyId: string) => {
  return consoleClient.deployments.deleteEnvironmentAPIToken({
    params: {
      appInstanceId: appId,
      apiKeyId,
    },
  })
}

export const patchAccessChannel = async (appId: string, enabled: boolean) => {
  return consoleClient.deployments.patchAccessChannel({
    params: {
      appInstanceId: appId,
    },
    body: {
      enabled,
    },
  })
}

export const patchDeveloperAPI = async (appId: string, enabled: boolean) => {
  return consoleClient.deployments.patchDeveloperAPI({
    params: {
      appInstanceId: appId,
    },
    body: {
      enabled,
    },
  })
}

export const updateEnvironmentAccessPolicy = async (
  appId: string,
  environmentId: string,
  accessMode: string,
  subjects: AccessSubject[] = [],
) => {
  return consoleClient.deployments.updateEnvironmentAccessPolicy({
    params: {
      appInstanceId: appId,
      environmentId,
    },
    body: {
      accessMode,
      subjects,
    },
  })
}

export const createAppInstance = async ({
  sourceAppId,
  name,
  description,
}: CreateInstanceParams): Promise<CreateAppInstanceReply> => {
  return consoleClient.deployments.createInstance({
    body: {
      sourceAppId,
      name,
      description,
    },
  })
}

export const updateAppInstance = async (
  appId: string,
  { name, description }: UpdateInstanceParams,
) => {
  return consoleClient.deployments.updateInstance({
    params: {
      appInstanceId: appId,
    },
    body: {
      name,
      description,
    },
  })
}

export const deleteAppInstance = async (appId: string) => {
  return consoleClient.deployments.deleteInstance({
    params: {
      appInstanceId: appId,
    },
  })
}
