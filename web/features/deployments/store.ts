import type { DeploymentsStore } from './store/actions'

import { create } from 'zustand'
import { createDeploymentsActions } from './store/actions'
import { initialDeploymentsState } from './store/initial-state'
import { deploymentsSelectors } from './store/selectors'

export const useDeploymentsStore = create<DeploymentsStore>()((...parameters) => ({
  ...initialDeploymentsState,
  ...createDeploymentsActions(...parameters),
}))

export const useDeploymentInstance = (appId?: string) => {
  return useDeploymentsStore(deploymentsSelectors.instance(appId))
}

export const useDeploymentAppData = (appId?: string) => {
  return useDeploymentsStore(deploymentsSelectors.appData(appId))
}
