import { atom } from 'jotai'

type OpenDeployDrawerParams = {
  appInstanceId: string
  environmentId?: string
  releaseId?: string
}

export const deployDrawerOpenAtom = atom(false)
export const deployDrawerAppInstanceIdAtom = atom<string | undefined>(undefined)
export const deployDrawerEnvironmentIdAtom = atom<string | undefined>(undefined)
export const deployDrawerReleaseIdAtom = atom<string | undefined>(undefined)

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
