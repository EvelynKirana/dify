import { create } from 'zustand'

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

type DeploymentsStore = {
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
}

export const useDeploymentsStore = create<DeploymentsStore>()(set => ({
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
}))
