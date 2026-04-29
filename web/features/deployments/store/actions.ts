import type { StateCreator } from 'zustand'
import type {
  CreateInstanceParams,
  DeploymentAppData,
  ListAppDeploymentsQuery,
} from '../data'
import type { AppInfo } from '../types'
import type { DeploymentsState } from './initial-state'
import type { AccessSubject, ConsoleReleaseSummary, ListAppDeploymentsReply } from '@/contract/console/deployments'
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
} from '../data'

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

export type CreateInstanceResult = {
  appInstanceId: string
  initialRelease?: ConsoleReleaseSummary
}

export type DeploymentsAction = {
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

export type DeploymentsStore = DeploymentsState & DeploymentsAction

type Setter = Parameters<StateCreator<DeploymentsStore>>[0]
type Getter = Parameters<StateCreator<DeploymentsStore>>[1]

class DeploymentsActionImpl implements DeploymentsAction {
  readonly #get: Getter
  readonly #set: Setter

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void _api
    this.#set = set
    this.#get = get
  }

  openDeployDrawer = (params: OpenDeployDrawerParams) => {
    this.#set({
      deployDrawer: {
        open: true,
        appId: params.appId,
        environmentId: params.environmentId,
        releaseId: params.releaseId,
      },
    })
  }

  closeDeployDrawer = () => {
    this.#set({ deployDrawer: { open: false } })
  }

  openRollbackModal = ({ appId, environmentId, deploymentId, targetReleaseId }: OpenRollbackParams) => {
    this.#set({
      rollbackModal: { open: true, appId, environmentId, deploymentId, targetReleaseId },
    })
  }

  closeRollbackModal = () => {
    this.#set({ rollbackModal: { open: false } })
  }

  openCreateInstanceModal = () => {
    this.#set({ createInstanceModal: { open: true } })
  }

  closeCreateInstanceModal = () => {
    this.#set({ createInstanceModal: { open: false } })
  }

  upsertInstances = (apps: AppInfo[]) => {
    this.#set(state => ({
      instancesById: apps.reduce((next, app) => {
        next[app.id] = {
          ...next[app.id],
          ...app,
        }
        return next
      }, { ...state.instancesById }),
    }))
  }

  applyAppData = (data: DeploymentAppData) => {
    this.#set(state => ({
      appData: {
        ...state.appData,
        [data.appId]: data,
      },
    }))
  }

  bumpDeploymentListRefresh = () => {
    this.#set(state => ({
      listRefreshToken: state.listRefreshToken + 1,
    }))
  }

  fetchSourceApps = async (query: ListAppDeploymentsQuery) => {
    const response = await listAppDeployments(query)
    const apps = response.data
      ?.map(toAppInfoFromSummary)
      .filter((app): app is AppInfo => Boolean(app)) ?? []
    this.upsertInstances(apps)
    return response
  }

  fetchAppData = async (appId: string) => {
    const data = await fetchDeploymentAppData(appId)
    this.applyAppData(data)
    const app = toAppInfoFromOverview(data.overview.instance)
    if (app)
      this.upsertInstances([app])
    return data
  }

  refreshAppData = async (appId: string) => {
    const data = await refreshDeploymentAppData(appId)
    this.applyAppData(data)
    const app = toAppInfoFromOverview(data.overview.instance)
    if (app)
      this.upsertInstances([app])
  }

  createInstance = async ({ sourceAppId, name, description }: CreateInstanceParams) => {
    const response = await createAppInstance({ sourceAppId, name, description })
    if (!response.appInstanceId)
      throw new Error('Create app instance did not return an appInstanceId.')

    this.#set({ createInstanceModal: { open: false } })
    await Promise.allSettled([
      refreshDeploymentAppDataWhenReady(response.appInstanceId)
        .then((data) => {
          this.applyAppData(data)
          const app = toAppInfoFromOverview(data.overview.instance)
          if (app)
            this.upsertInstances([app])
        }),
      waitForAppInstanceInDeploymentList(response.appInstanceId).then((list) => {
        const apps = list?.data
          ?.map(toAppInfoFromSummary)
          .filter((app): app is AppInfo => Boolean(app)) ?? []
        this.upsertInstances(apps)
      }),
    ])
    this.bumpDeploymentListRefresh()
    return {
      appInstanceId: response.appInstanceId,
      initialRelease: response.initialRelease,
    }
  }

  updateInstance = async (appId: string, patch: Pick<AppInfo, 'name' | 'description'>) => {
    await updateAppInstance(appId, {
      name: patch.name,
      description: patch.description,
    })
    await this.refreshAppData(appId)
    this.bumpDeploymentListRefresh()
    this.#set(state => ({
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
  }

  switchSourceApp = () => undefined

  deleteInstance = async (appId: string) => {
    await deleteAppInstance(appId)
    this.#set((state) => {
      const { [appId]: _removed, ...appData } = state.appData
      const { [appId]: _removedInstance, ...instancesById } = state.instancesById
      return {
        instancesById,
        appData,
      }
    })
    this.bumpDeploymentListRefresh()
  }

  startDeploy = async ({ appId, environmentId, releaseId, releaseNote }: StartDeployParams) => {
    this.#set({ deployDrawer: { open: false } })
    await createDeployment({ appId, environmentId, releaseId, releaseNote })
    await this.refreshAppData(appId)
    this.bumpDeploymentListRefresh()
  }

  retryDeploy = async (appId: string, environmentId: string, targetReleaseId: string) => {
    await createDeployment({ appId, environmentId, releaseId: targetReleaseId })
    await this.refreshAppData(appId)
    this.bumpDeploymentListRefresh()
  }

  rollbackDeployment = async (appId: string, environmentId: string, targetReleaseId: string) => {
    this.#set({ rollbackModal: { open: false } })
    await createDeployment({ appId, environmentId, releaseId: targetReleaseId })
    await this.refreshAppData(appId)
    this.bumpDeploymentListRefresh()
  }

  undeployDeployment = async (appId: string, _environmentId: string, runtimeInstanceId?: string, isDeploying?: boolean) => {
    if (!runtimeInstanceId)
      return
    if (isDeploying)
      await cancelDeployment(appId, runtimeInstanceId)
    else
      await undeployEnvironment(appId, runtimeInstanceId)
    await this.refreshAppData(appId)
    this.bumpDeploymentListRefresh()
  }

  generateApiKey = async (appId: string, environmentId: string) => {
    const appData = this.#get().appData[appId]
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
    await this.refreshAppData(appId)
    if (response.apiToken?.token) {
      this.#set({
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
  }

  revokeApiKey = async (appId: string, _environmentId: string, apiKeyId: string) => {
    await deleteApiKey(appId, apiKeyId)
    await this.refreshAppData(appId)
  }

  clearCreatedApiToken = () => {
    this.#set({ createdApiToken: undefined })
  }

  toggleAccessChannel = async (appId: string, channel: string, enabled: boolean) => {
    if (channel === 'api')
      await patchDeveloperAPI(appId, enabled)
    else
      await patchAccessChannel(appId, enabled)
    await this.refreshAppData(appId)
  }

  setEnvironmentAccessPolicy = async (
    appId: string,
    environmentId: string,
    _channel: string,
    _enabled: boolean,
    accessMode: string,
    subjects: AccessSubject[],
  ) => {
    await updateEnvironmentAccessPolicy(appId, environmentId, accessMode, subjects)
    await this.refreshAppData(appId)
  }
}

export const createDeploymentsActions = (
  ...parameters: Parameters<StateCreator<DeploymentsStore>>
) => new DeploymentsActionImpl(...parameters)
