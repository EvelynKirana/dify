import type { AppInfo } from './types'
import type { APIToken, BindingsProto } from '@/contract/console/deployments'
import type { DeploymentAppData } from '@/service/deployments'
import { create } from 'zustand'
import {
  cancelDeployment,
  createApiKey,
  createDeployment,
  deleteApiKey,
  fetchDeploymentAppData,
  patchAccessChannel,
  rollbackEnvironment,
  undeployEnvironment,
  updateEnvironmentAccessPolicy,
} from '@/service/deployments'

export type StartDeployParams = {
  appId: string
  environmentId: string
  releaseId?: string
  releaseNote?: string
  bindings?: BindingsProto
}

type OpenDeployDrawerParams = {
  appId: string
  environmentId?: string
  releaseId?: string
}

type OpenRollbackParams = {
  appId: string
  environmentId: string
  targetReleaseId: string
  deploymentId?: string
}

type CreatedApiToken = Pick<APIToken, 'id' | 'environmentId' | 'maskedPrefix' | 'name'> & {
  appId: string
  token: string
}

export type CreateInstanceParams = {
  appId: string
  name: string
  description?: string
}

type DeploymentsState = {
  sourceApps: AppInfo[]
  appData: Record<string, DeploymentAppData>
  createdApiToken?: CreatedApiToken

  deployDrawer: {
    open: boolean
    appId?: string
    environmentId?: string
    releaseId?: string
  }
  rollbackModal: {
    open: boolean
    appId?: string
    environmentId?: string
    deploymentId?: string
    targetReleaseId?: string
  }
  createInstanceModal: { open: boolean }

  openDeployDrawer: (params: OpenDeployDrawerParams) => void
  closeDeployDrawer: () => void

  openRollbackModal: (params: OpenRollbackParams) => void
  closeRollbackModal: () => void

  openCreateInstanceModal: () => void
  closeCreateInstanceModal: () => void

  seedInstancesFromApps: (apps: AppInfo[]) => void
  applyAppData: (data: DeploymentAppData) => void
  refreshAppData: (appId: string) => Promise<void>

  createInstance: (params: CreateInstanceParams) => string
  updateInstance: (appId: string, patch: Partial<Pick<AppInfo, 'name' | 'description'>>) => void
  switchSourceApp: (appId: string, nextAppId: string) => void
  deleteInstance: (appId: string) => void

  startDeploy: (params: StartDeployParams) => Promise<void>
  retryDeploy: (appId: string, environmentId: string, targetReleaseId: string) => Promise<void>
  rollbackDeployment: (appId: string, environmentId: string, targetReleaseId: string) => Promise<void>
  undeployDeployment: (appId: string, environmentId: string, deploymentId?: string, isDeploying?: boolean) => Promise<void>

  generateApiKey: (appId: string, environmentId: string) => Promise<void>
  revokeApiKey: (appId: string, environmentId: string, apiKeyId: string) => Promise<void>
  clearCreatedApiToken: () => void
  toggleAccessChannel: (appId: string, channel: string, enabled: boolean, expectedVersion: number) => Promise<void>
  setEnvironmentAccessPolicy: (
    appId: string,
    environmentId: string,
    channel: string,
    enabled: boolean,
    accessMode: string,
    expectedVersion: number,
  ) => Promise<void>
}

export const useDeploymentsStore = create<DeploymentsState>((set, get) => ({
  sourceApps: [],
  appData: {},
  createdApiToken: undefined,

  deployDrawer: { open: false },
  rollbackModal: { open: false },
  createInstanceModal: { open: false },

  openDeployDrawer: params => set({
    deployDrawer: {
      open: true,
      appId: params.appId,
      environmentId: params.environmentId,
      releaseId: params.releaseId,
    },
  }),
  closeDeployDrawer: () => set({ deployDrawer: { open: false } }),

  openRollbackModal: ({ appId, environmentId, deploymentId, targetReleaseId }) => set({
    rollbackModal: { open: true, appId, environmentId, deploymentId, targetReleaseId },
  }),
  closeRollbackModal: () => set({ rollbackModal: { open: false } }),

  openCreateInstanceModal: () => set({ createInstanceModal: { open: true } }),
  closeCreateInstanceModal: () => set({ createInstanceModal: { open: false } }),

  seedInstancesFromApps: apps => set(state => ({
    sourceApps: apps,
    appData: Object.fromEntries(
      Object.entries(state.appData).filter(([appId]) => apps.some(app => app.id === appId)),
    ),
  })),

  applyAppData: data => set(state => ({
    appData: {
      ...state.appData,
      [data.appId]: data,
    },
  })),

  refreshAppData: async (appId) => {
    const data = await fetchDeploymentAppData(appId)
    get().applyAppData(data)
  },

  createInstance: ({ appId }) => {
    set({ createInstanceModal: { open: false } })
    return appId
  },

  updateInstance: () => undefined,

  switchSourceApp: () => undefined,

  deleteInstance: () => undefined,

  startDeploy: async ({ appId, environmentId, releaseId, releaseNote, bindings }) => {
    set({ deployDrawer: { open: false } })
    await createDeployment({ appId, environmentId, releaseId, releaseNote, bindings })
    await get().refreshAppData(appId)
  },

  retryDeploy: async (appId, environmentId, targetReleaseId) => {
    await rollbackEnvironment(appId, environmentId, targetReleaseId)
    await get().refreshAppData(appId)
  },

  rollbackDeployment: async (appId, environmentId, targetReleaseId) => {
    set({ rollbackModal: { open: false } })
    await rollbackEnvironment(appId, environmentId, targetReleaseId)
    await get().refreshAppData(appId)
  },

  undeployDeployment: async (appId, environmentId, deploymentId, isDeploying) => {
    if (isDeploying && deploymentId)
      await cancelDeployment(appId, environmentId, deploymentId)
    else
      await undeployEnvironment(appId, environmentId)
    await get().refreshAppData(appId)
  },

  generateApiKey: async (appId, environmentId) => {
    const appData = get().appData[appId]
    const existingCount = appData?.accessConfig.developerApi?.apiKeys?.filter(key => key.environmentId === environmentId).length ?? 0
    const environmentName = appData
      ?.environmentDeployments
      .environmentDeployments
      ?.find(row => row.environment?.id === environmentId)
      ?.environment
      ?.name ?? 'env'
    const label = `${environmentName}-key-${String(existingCount + 1).padStart(3, '0')}`
    const response = await createApiKey(appId, environmentId, label)
    await get().refreshAppData(appId)
    if (response.apiToken?.token) {
      set({
        createdApiToken: {
          id: response.apiToken.id,
          appId,
          environmentId,
          maskedPrefix: response.apiToken.maskedPrefix,
          name: response.apiToken.name || label,
          token: response.apiToken.token,
        },
      })
    }
  },

  revokeApiKey: async (appId, environmentId, apiKeyId) => {
    await deleteApiKey(appId, environmentId, apiKeyId)
    await get().refreshAppData(appId)
  },

  clearCreatedApiToken: () => set({ createdApiToken: undefined }),

  toggleAccessChannel: async (appId, channel, enabled, expectedVersion) => {
    await patchAccessChannel(appId, channel, enabled, expectedVersion)
    await get().refreshAppData(appId)
  },

  setEnvironmentAccessPolicy: async (appId, environmentId, channel, enabled, accessMode, expectedVersion) => {
    await updateEnvironmentAccessPolicy(appId, environmentId, channel, enabled, accessMode, [], expectedVersion)
    await get().refreshAppData(appId)
  },
}))
