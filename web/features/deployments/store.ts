import type { DeploymentAppData, ListAppDeploymentsQuery } from './data'
import type { AppInfo } from './types'
import type { AccessSubject, APIToken, ConsoleReleaseSummary, ListAppDeploymentsReply } from '@/contract/console/deployments'
import { create } from 'zustand'
import {
  cancelDeployment,
  createApiKey,
  createAppInstance,
  createDeployment,
  deleteApiKey,
  deleteAppInstance,
  fetchDeploymentAppData,
  listAppDeployments,
  patchAccessChannel,
  patchDeveloperAPI,
  refreshDeploymentAppData,
  refreshDeploymentAppDataWhenReady,
  toAppInfoFromOverview,
  toAppInfoFromSummary,
  undeployEnvironment,
  updateAppInstance,
  updateEnvironmentAccessPolicy,
  waitForAppInstanceInDeploymentList,
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
  instancesById: Record<string, AppInfo>
  appData: Record<string, DeploymentAppData>
  listRefreshToken: number
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

  upsertInstances: (apps: AppInfo[]) => void
  applyAppData: (data: DeploymentAppData) => void
  bumpDeploymentListRefresh: () => void
  fetchSourceApps: (query: ListAppDeploymentsQuery) => Promise<ListAppDeploymentsReply>
  fetchAppData: (appId: string) => Promise<DeploymentAppData>
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
  instancesById: {},
  appData: {},
  listRefreshToken: 0,
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

  upsertInstances: apps => set(state => ({
    instancesById: apps.reduce((next, app) => {
      next[app.id] = {
        ...next[app.id],
        ...app,
      }
      return next
    }, { ...state.instancesById }),
  })),

  applyAppData: data => set(state => ({
    appData: {
      ...state.appData,
      [data.appId]: data,
    },
  })),

  bumpDeploymentListRefresh: () => set(state => ({
    listRefreshToken: state.listRefreshToken + 1,
  })),

  fetchSourceApps: async (query) => {
    const response = await listAppDeployments(query)
    const apps = response.data
      ?.map(toAppInfoFromSummary)
      .filter((app): app is AppInfo => Boolean(app)) ?? []
    get().upsertInstances(apps)
    return response
  },

  fetchAppData: async (appId) => {
    const data = await fetchDeploymentAppData(appId)
    get().applyAppData(data)
    const app = toAppInfoFromOverview(data.overview.instance)
    if (app)
      get().upsertInstances([app])
    return data
  },

  refreshAppData: async (appId) => {
    const data = await refreshDeploymentAppData(appId)
    get().applyAppData(data)
    const app = toAppInfoFromOverview(data.overview.instance)
    if (app)
      get().upsertInstances([app])
  },

  createInstance: async ({ sourceAppId, name, description }) => {
    const response = await createAppInstance({ sourceAppId, name, description })
    if (!response.appInstanceId)
      throw new Error('Create app instance did not return an appInstanceId.')
    set({ createInstanceModal: { open: false } })
    await Promise.allSettled([
      refreshDeploymentAppDataWhenReady(response.appInstanceId)
        .then((data) => {
          get().applyAppData(data)
          const app = toAppInfoFromOverview(data.overview.instance)
          if (app)
            get().upsertInstances([app])
        }),
      waitForAppInstanceInDeploymentList(response.appInstanceId).then((list) => {
        const apps = list?.data
          ?.map(toAppInfoFromSummary)
          .filter((app): app is AppInfo => Boolean(app)) ?? []
        get().upsertInstances(apps)
      }),
    ])
    get().bumpDeploymentListRefresh()
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
    get().bumpDeploymentListRefresh()
    set(state => ({
      instancesById: {
        ...state.instancesById,
        [appId]: {
          ...state.instancesById[appId],
          id: appId,
          name: patch.name,
          mode: state.instancesById[appId]?.mode ?? 'workflow',
          description: patch.description,
        },
      },
    }))
  },

  switchSourceApp: () => undefined,

  deleteInstance: async (appId) => {
    await deleteAppInstance(appId)
    set((state) => {
      const { [appId]: _removed, ...appData } = state.appData
      const { [appId]: _removedInstance, ...instancesById } = state.instancesById
      return {
        instancesById,
        appData,
      }
    })
    get().bumpDeploymentListRefresh()
  },

  startDeploy: async ({ appId, environmentId, releaseId, releaseNote }) => {
    set({ deployDrawer: { open: false } })
    await createDeployment({ appId, environmentId, releaseId, releaseNote })
    await get().refreshAppData(appId)
    get().bumpDeploymentListRefresh()
  },

  retryDeploy: async (appId, environmentId, targetReleaseId) => {
    await createDeployment({ appId, environmentId, releaseId: targetReleaseId })
    await get().refreshAppData(appId)
    get().bumpDeploymentListRefresh()
  },

  rollbackDeployment: async (appId, environmentId, targetReleaseId) => {
    set({ rollbackModal: { open: false } })
    await createDeployment({ appId, environmentId, releaseId: targetReleaseId })
    await get().refreshAppData(appId)
    get().bumpDeploymentListRefresh()
  },

  undeployDeployment: async (appId, _environmentId, runtimeInstanceId, isDeploying) => {
    if (!runtimeInstanceId)
      return
    if (isDeploying)
      await cancelDeployment(appId, runtimeInstanceId)
    else
      await undeployEnvironment(appId, runtimeInstanceId)
    await get().refreshAppData(appId)
    get().bumpDeploymentListRefresh()
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

export const useDeploymentInstance = (appId?: string) => {
  return useDeploymentsStore(state => appId ? state.instancesById[appId] : undefined)
}

export const useDeploymentAppData = (appId?: string) => {
  return useDeploymentsStore(state => appId ? state.appData[appId] : undefined)
}
