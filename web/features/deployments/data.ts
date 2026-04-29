import type {
  AccessSubject,
  BindingsProto,
  GetAccessConfigReply,
  GetDeploymentOverviewReply,
  ListDeploymentCandidatesReply,
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
  candidates: ListDeploymentCandidatesReply
  releaseHistory: ListReleaseHistoryReply
  accessConfig: GetAccessConfigReply
}

export type CreateDeploymentParams = {
  appId: string
  environmentId: string
  releaseId?: string
  releaseNote?: string
  bindings?: BindingsProto
}

const idempotencyKey = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`

export const deploymentAppDataQueryKey = (appId: string) => ['console', 'deployments', 'app-data', appId] as const

export const fetchDeploymentAppData = async (appId: string): Promise<DeploymentAppData> => {
  const input = { params: { appId } }
  const [
    overview,
    environmentDeployments,
    candidates,
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
    consoleClient.deployments.candidates(input),
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
    candidates,
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

export const createDeployment = async ({
  appId,
  environmentId,
  releaseId,
  releaseNote,
  bindings,
}: CreateDeploymentParams) => {
  const trimmedReleaseNote = releaseNote?.trim()
  return consoleClient.deployments.createDeployment({
    params: {
      appId,
      environmentId,
    },
    body: {
      ...(releaseId
        ? { releaseId }
        : { currentApp: { releaseNote: trimmedReleaseNote || undefined } }),
      bindings,
      idempotencyKey: idempotencyKey('deploy'),
    },
  })
}

export const cancelDeployment = async (appId: string, environmentId: string, deploymentId: string) => {
  return consoleClient.deployments.cancelDeployment({
    params: {
      appId,
      environmentId,
      deploymentId,
    },
    body: {
      idempotencyKey: idempotencyKey('cancel'),
    },
  })
}

export const undeployEnvironment = async (appId: string, environmentId: string) => {
  return consoleClient.deployments.undeployEnvironment({
    params: {
      appId,
      environmentId,
    },
    body: {
      idempotencyKey: idempotencyKey('undeploy'),
    },
  })
}

export const rollbackEnvironment = async (appId: string, environmentId: string, targetReleaseId: string) => {
  return consoleClient.deployments.rollbackEnvironment({
    params: {
      appId,
      environmentId,
    },
    body: {
      targetReleaseId,
      idempotencyKey: idempotencyKey('rollback'),
    },
  })
}

export const createApiKey = async (appId: string, environmentId: string, name: string) => {
  return consoleClient.deployments.createEnvironmentAPIToken({
    params: {
      appId,
      environmentId,
    },
    body: {
      name,
    },
  })
}

export const deleteApiKey = async (appId: string, environmentId: string, apiKeyId: string) => {
  return consoleClient.deployments.deleteEnvironmentAPIToken({
    params: {
      appId,
      environmentId,
      apiKeyId,
    },
  })
}

export const patchAccessChannel = async (appId: string, channel: string, enabled: boolean, expectedVersion = 0) => {
  return consoleClient.deployments.patchAccessChannel({
    params: {
      appId,
      channel,
    },
    body: {
      channel,
      enabled,
      expectedVersion,
    },
  })
}

export const updateEnvironmentAccessPolicy = async (
  appId: string,
  environmentId: string,
  channel: string,
  enabled: boolean,
  accessMode: string,
  subjects: AccessSubject[] = [],
  expectedVersion = 0,
) => {
  return consoleClient.deployments.updateEnvironmentAccessPolicy({
    params: {
      appId,
      environmentId,
      channel,
    },
    body: {
      channel,
      enabled,
      accessMode,
      subjects,
      expectedVersion,
    },
  })
}
