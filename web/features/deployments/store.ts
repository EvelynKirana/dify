import { atom } from 'jotai'

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

export const deployDrawerOpenAtom = atom(false)
export const deployDrawerAppInstanceIdAtom = atom<string | undefined>(undefined)
export const deployDrawerEnvironmentIdAtom = atom<string | undefined>(undefined)
export const deployDrawerReleaseIdAtom = atom<string | undefined>(undefined)

export const rollbackModalOpenAtom = atom(false)
export const rollbackModalAppInstanceIdAtom = atom<string | undefined>(undefined)
export const rollbackModalEnvironmentIdAtom = atom<string | undefined>(undefined)
export const rollbackModalDeploymentIdAtom = atom<string | undefined>(undefined)
export const rollbackModalTargetReleaseIdAtom = atom<string | undefined>(undefined)

export const createInstanceModalOpenAtom = atom(false)

export const openDeployDrawerAtom = atom(null, (_get, set, params: OpenDeployDrawerParams) => {
  set(deployDrawerAppInstanceIdAtom, params.appInstanceId)
  set(deployDrawerEnvironmentIdAtom, params.environmentId)
  set(deployDrawerReleaseIdAtom, params.releaseId)
  set(deployDrawerOpenAtom, true)
})
export const closeDeployDrawerAtom = atom(null, (_get, set) => {
  set(deployDrawerOpenAtom, false)
  set(deployDrawerAppInstanceIdAtom, undefined)
  set(deployDrawerEnvironmentIdAtom, undefined)
  set(deployDrawerReleaseIdAtom, undefined)
})

export const openRollbackModalAtom = atom(null, (_get, set, {
  appInstanceId,
  environmentId,
  deploymentId,
  targetReleaseId,
}: OpenRollbackParams) => {
  set(rollbackModalAppInstanceIdAtom, appInstanceId)
  set(rollbackModalEnvironmentIdAtom, environmentId)
  set(rollbackModalDeploymentIdAtom, deploymentId)
  set(rollbackModalTargetReleaseIdAtom, targetReleaseId)
  set(rollbackModalOpenAtom, true)
})
export const closeRollbackModalAtom = atom(null, (_get, set) => {
  set(rollbackModalOpenAtom, false)
  set(rollbackModalAppInstanceIdAtom, undefined)
  set(rollbackModalEnvironmentIdAtom, undefined)
  set(rollbackModalDeploymentIdAtom, undefined)
  set(rollbackModalTargetReleaseIdAtom, undefined)
})

export const openCreateInstanceModalAtom = atom(null, (_get, set) => {
  set(createInstanceModalOpenAtom, true)
})
export const closeCreateInstanceModalAtom = atom(null, (_get, set) => {
  set(createInstanceModalOpenAtom, false)
})
