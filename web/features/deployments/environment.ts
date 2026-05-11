import type { ConsoleEnvironment, DeploymentEnvironmentOption } from '@dify/contracts/enterprise/types.gen'

export function environmentId(environment?: ConsoleEnvironment | DeploymentEnvironmentOption) {
  return environment?.id ?? ''
}

export function environmentName(environment?: ConsoleEnvironment | DeploymentEnvironmentOption) {
  return environment?.name || environment?.id || '—'
}

export function environmentMode(environment?: ConsoleEnvironment | DeploymentEnvironmentOption) {
  const type = environment?.type?.toLowerCase() ?? ''
  return type.includes('isolated') ? 'isolated' : 'shared'
}

function environmentRuntimeName(environment?: ConsoleEnvironment | DeploymentEnvironmentOption) {
  if (!environment)
    return ''
  if ('backend' in environment && environment.backend)
    return environment.backend
  if ('runtime' in environment && environment.runtime)
    return environment.runtime
  return ''
}

export function environmentBackend(environment?: ConsoleEnvironment | DeploymentEnvironmentOption) {
  const runtime = environmentRuntimeName(environment).toLowerCase()
  return runtime.includes('host') ? 'host' : 'k8s'
}

export function environmentHealth(environment?: ConsoleEnvironment | DeploymentEnvironmentOption) {
  const status = environment?.status?.toLowerCase() ?? ''
  return status.includes('ready') ? 'ready' : 'degraded'
}
