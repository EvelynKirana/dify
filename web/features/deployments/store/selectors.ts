import type { ListAppDeploymentsQuery } from '../data'
import type { DeploymentsStore } from './actions'
import { emptySourceAppsList, sourceAppsListKey } from './source-apps'

export const deploymentsSelectors = {
  appData: (appId?: string) => (state: DeploymentsStore) =>
    appId ? state.appData[appId] : undefined,
  createdApiToken: (state: DeploymentsStore) => state.createdApiToken,
  instance: (appId?: string) => (state: DeploymentsStore) =>
    appId ? state.instancesById[appId] : undefined,
  instancesById: (state: DeploymentsStore) => state.instancesById,
  listRefreshToken: (state: DeploymentsStore) => state.listRefreshToken,
  sourceAppsList: (query: ListAppDeploymentsQuery) => (state: DeploymentsStore) =>
    state.sourceAppLists[sourceAppsListKey(query)] ?? emptySourceAppsList,
}
