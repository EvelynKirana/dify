import type { DeploymentAppData } from '../data'
import type { AppInfo } from '../types'
import type { APIToken } from '@/contract/console/deployments'

export type CreatedApiToken = Pick<APIToken, 'id' | 'environmentId' | 'maskedPrefix' | 'name'> & {
  appId: string
  token: string
}

export type DeploymentsState = {
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
}

export const initialDeploymentsState: DeploymentsState = {
  instancesById: {},
  appData: {},
  listRefreshToken: 0,
  createdApiToken: undefined,

  deployDrawer: { open: false },
  rollbackModal: { open: false },
  createInstanceModal: { open: false },
}
