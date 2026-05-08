import type {
  ConsoleEnvironment,
  EnvironmentAccessRow,
} from '@dify/contracts/enterprise/types.gen'
import { useQuery } from '@tanstack/react-query'
import { consoleQuery } from '@/service/client'
import { deployedRows } from '../../utils'

const EMPTY_ACCESS_PERMISSIONS: EnvironmentAccessRow[] = []

function uniqueEnvironments(environments: (ConsoleEnvironment | undefined)[]) {
  return environments.filter((environment, index): environment is ConsoleEnvironment => {
    if (!environment?.id)
      return false
    return environments.findIndex(candidate => candidate?.id === environment.id) === index
  })
}

export function useAccessEnvironmentScope(appId: string) {
  const appInput = { params: { appInstanceId: appId } }
  const { data: accessConfig } = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceAccess.queryOptions({
    input: appInput,
  }))
  const { data: environmentDeployments } = useQuery(consoleQuery.enterprise.appDeploy.listRuntimeInstances.queryOptions({
    input: appInput,
  }))
  const deploymentRows = deployedRows(environmentDeployments?.data)
  const policies = accessConfig?.permissions ?? EMPTY_ACCESS_PERMISSIONS
  const environments = uniqueEnvironments([
    ...deploymentRows.map(row => row.environment),
    ...policies.map(policy => policy.environment),
    ...(accessConfig?.accessChannels?.webappRows?.map(row => row.environment) ?? []),
  ])

  return {
    accessConfig,
    environments,
    policies,
  }
}
