import { create } from 'zustand'

type OpenDeployDrawerParams = {
  appInstanceId: string
  environmentId?: string
  releaseId?: string
}

type OpenRollbackParams = {
  appInstanceId: string
  environmentId: string
  targetReleaseId: string
  deploymentId?: string
}

type DeploymentsStore = {
  deployDrawer: {
    open: boolean
    appInstanceId?: string
    environmentId?: string
    releaseId?: string
  }
  rollbackModal: {
    open: boolean
    appInstanceId?: string
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
      appInstanceId: params.appInstanceId,
      environmentId: params.environmentId,
      releaseId: params.releaseId,
    },
  }),
  closeDeployDrawer: () => set({ deployDrawer: { open: false } }),
  openRollbackModal: ({ appInstanceId, environmentId, deploymentId, targetReleaseId }) => set({
    rollbackModal: { open: true, appInstanceId, environmentId, deploymentId, targetReleaseId },
  }),
  closeRollbackModal: () => set({ rollbackModal: { open: false } }),
  openCreateInstanceModal: () => set({ createInstanceModal: { open: true } }),
  closeCreateInstanceModal: () => set({ createInstanceModal: { open: false } }),
}))
