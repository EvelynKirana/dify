import type { DeploymentAppData } from './data'
import type { AppInfo } from './types'
import type { AccessSubject, APIToken, ConsoleReleaseSummary } from '@/contract/console/deployments'
import { create } from 'zustand'
import {
  cancelDeployment,
  createApiKey,
  createAppInstance,
  createDeployment,
  deleteApiKey,
  deleteAppInstance,
  patchAccessChannel,
  patchDeveloperAPI,
  refreshDeploymentAppData,
  undeployEnvironment,
  updateAppInstance,
  updateEnvironmentAccessPolicy,
} from './data'

export type StartDeployParams = {
  appId: string
  environmentId: string
  releaseId?: string
  releaseNote?: string
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
  sourceAppId: string
  name: string
  description?: string
}

export type CreateInstanceResult = {
  appInstanceId: string
  initialRelease?: ConsoleReleaseSummary
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

  createInstance: (params: CreateInstanceParams) => Promise<CreateInstanceResult>
  updateInstance: (appId: string, patch: Pick<AppInfo, 'name' | 'description'>) => Promise<void>
  switchSourceApp: (appId: string, nextAppId: string) => void
  deleteInstance: (appId: string) => Promise<void>

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
    subjects: AccessSubject[],
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
    const data = await refreshDeploymentAppData(appId)
    get().applyAppData(data)
  },

  createInstance: async ({ sourceAppId, name, description }) => {
    const response = await createAppInstance({ sourceAppId, name, description })
    if (!response.appInstanceId)
      throw new Error('Create app instance did not return an appInstanceId.')
    set({ createInstanceModal: { open: false } })
    return {
      appInstanceId: response.appInstanceId,
      initialRelease: response.initialRelease,
    }
  },

  updateInstance: async (appId, patch) => {
    await updateAppInstance(appId, {
      name: patch.name,
      description: patch.description,
    })
    await get().refreshAppData(appId)
    set(state => ({
      sourceApps: state.sourceApps.map(app => app.id === appId ? { ...app, ...patch } : app),
    }))
  },

  switchSourceApp: () => undefined,

  deleteInstance: async (appId) => {
    await deleteAppInstance(appId)
    set((state) => {
      const { [appId]: _removed, ...appData } = state.appData
      return {
        sourceApps: state.sourceApps.filter(app => app.id !== appId),
        appData,
      }
    })
  },

  startDeploy: async ({ appId, environmentId, releaseId, releaseNote }) => {
    set({ deployDrawer: { open: false } })
    await createDeployment({ appId, environmentId, releaseId, releaseNote })
    await get().refreshAppData(appId)
  },

  retryDeploy: async (appId, environmentId, targetReleaseId) => {
    await createDeployment({ appId, environmentId, releaseId: targetReleaseId })
    await get().refreshAppData(appId)
  },

  rollbackDeployment: async (appId, environmentId, targetReleaseId) => {
    set({ rollbackModal: { open: false } })
    await createDeployment({ appId, environmentId, releaseId: targetReleaseId })
    await get().refreshAppData(appId)
  },

  undeployDeployment: async (appId, _environmentId, runtimeInstanceId, isDeploying) => {
    if (!runtimeInstanceId)
      return
    if (isDeploying)
      await cancelDeployment(appId, runtimeInstanceId)
    else
      await undeployEnvironment(appId, runtimeInstanceId)
    await get().refreshAppData(appId)
  },

  generateApiKey: async (appId, environmentId) => {
    const appData = get().appData[appId]
    const existingCount = appData?.accessConfig.developerApi?.apiKeys?.filter(key =>
      (key.environmentId ?? key.environment?.id) === environmentId,
    ).length ?? 0
    const environmentName = appData
      ?.environmentDeployments
      .data
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
          environmentId: response.apiToken.environmentId ?? response.apiToken.environment?.id,
          maskedPrefix: response.apiToken.maskedPrefix ?? response.apiToken.maskedKey,
          name: response.apiToken.name || label,
          token: response.apiToken.token,
        },
      })
    }
  },

  revokeApiKey: async (appId, _environmentId, apiKeyId) => {
    await deleteApiKey(appId, apiKeyId)
    await get().refreshAppData(appId)
  },

  clearCreatedApiToken: () => set({ createdApiToken: undefined }),

  toggleAccessChannel: async (appId, channel, enabled) => {
    if (channel === 'api')
      await patchDeveloperAPI(appId, enabled)
    else
      await patchAccessChannel(appId, enabled)
    await get().refreshAppData(appId)
  },

  setEnvironmentAccessPolicy: async (appId, environmentId, _channel, _enabled, accessMode, subjects) => {
    await updateEnvironmentAccessPolicy(appId, environmentId, accessMode, subjects)
    await get().refreshAppData(appId)
  },
}))
