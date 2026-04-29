import type { AppInfo, AppMode } from './types'
import type {
  AccessSubject,
  AppDeploymentSummary,
  AppInstanceOverview,
  ConsoleReleaseSummary,
  CreateAppInstanceReply,
  GetAccessConfigReply,
  GetDeploymentOverviewReply,
  ListAppDeploymentsReply,
  ListEnvironmentDeploymentsReply,
  ListReleaseHistoryReply,
} from '@/contract/console/deployments'
import { queryOptions } from '@tanstack/react-query'
import { consoleClient } from '@/service/client'

const DEPLOYMENT_PAGE_SIZE = 100
const DEPLOYMENT_APP_DATA_STALE_TIME = 30 * 1000
const DEPLOYMENT_READINESS_RETRY_DELAYS = [0, 300, 700, 1200]

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

export type ListAppDeploymentsQuery = {
  environmentId?: string
  notDeployed?: boolean
  query?: string
  pageNumber?: number
  resultsPerPage?: number
}

export function toAppInfoFromSummary(summary: AppDeploymentSummary): AppInfo | undefined {
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

export function toAppInfoFromOverview(instance?: AppInstanceOverview): AppInfo | undefined {
  if (!instance?.id)
    return undefined

  return {
    id: instance.id,
    name: instance.name ?? instance.id,
    mode: (instance.mode || 'workflow') as AppMode,
    iconType: 'emoji',
    icon: instance.icon,
    description: instance.description ?? undefined,
    sourceAppId: instance.sourceAppId,
    sourceAppName: instance.sourceAppName,
  }
}

export const deploymentAppDataQueryKey = (appId: string) => ['console', 'deployments', 'app-data', appId] as const

export const listAppDeployments = async (query: ListAppDeploymentsQuery): Promise<ListAppDeploymentsReply> => {
  return consoleClient.deployments.list({
    query,
  })
}

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

const wait = (delay: number) => new Promise(resolve => setTimeout(resolve, delay))

export const refreshDeploymentAppDataWhenReady = async (appId: string): Promise<DeploymentAppData> => {
  let lastError: unknown

  for (const delay of DEPLOYMENT_READINESS_RETRY_DELAYS) {
    if (delay > 0)
      await wait(delay)

    try {
      return await fetchDeploymentAppData(appId)
    }
    catch (error) {
      lastError = error
    }
  }

  throw lastError
}

export const waitForAppInstanceInDeploymentList = async (appInstanceId: string): Promise<ListAppDeploymentsReply | undefined> => {
  let lastError: unknown

  for (const delay of DEPLOYMENT_READINESS_RETRY_DELAYS) {
    if (delay > 0)
      await wait(delay)

    try {
      const response = await listAppDeployments({
        pageNumber: 1,
        resultsPerPage: DEPLOYMENT_PAGE_SIZE,
      })
      if (response.data?.some(app => app.id === appInstanceId))
        return response
    }
    catch (error) {
      lastError = error
    }
  }

  if (lastError)
    throw lastError

  return undefined
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
