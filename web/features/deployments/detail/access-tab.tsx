'use client'

import type {
  ConsoleEnvironment,
  EnvironmentAccessRow,
} from '@dify/contracts/enterprise/types.gen'
import { useQuery } from '@tanstack/react-query'
import { consoleQuery } from '@/service/client'
import {
  deployedRows,
} from '../utils'
import { AccessChannelsSection } from './access-tab/channels-section'
import { DeveloperApiSection } from './access-tab/developer-api-section'
import { AccessPermissionsSection } from './access-tab/permissions-section'
import { getUrlOrigin } from './access-tab/url'

const EMPTY_ACCESS_PERMISSIONS: EnvironmentAccessRow[] = []

function uniqueEnvironments(environments: (ConsoleEnvironment | undefined)[]) {
  return environments.filter((environment, index): environment is ConsoleEnvironment => {
    if (!environment?.id)
      return false
    return environments.findIndex(candidate => candidate?.id === environment.id) === index
  })
}

export function AccessTab({ instanceId: appId }: {
  instanceId: string
}) {
  const appInput = { params: { appInstanceId: appId } }
  const { data: accessConfig } = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceAccess.queryOptions({
    input: appInput,
  }))
  const { data: environmentDeployments } = useQuery(consoleQuery.enterprise.appDeploy.listRuntimeInstances.queryOptions({
    input: appInput,
  }))
  const deploymentRows = deployedRows(environmentDeployments?.data)
  const policies = accessConfig?.permissions ?? EMPTY_ACCESS_PERMISSIONS
  const deployedEnvs = uniqueEnvironments([
    ...deploymentRows.map(row => row.environment),
    ...policies.map(policy => policy.environment),
    ...(accessConfig?.accessChannels?.webappRows?.map(row => row.environment) ?? []),
  ])
  const apiEnabled = accessConfig?.developerApi?.enabled ?? false
  const apiKeys = accessConfig?.developerApi?.apiKeys ?? []
  const webappRows = accessConfig?.accessChannels?.webappRows?.filter(row => row.url) ?? []
  const runEnabled = accessConfig?.accessChannels?.enabled ?? false
  const cliDomain = getUrlOrigin(accessConfig?.accessChannels?.cli?.url)
  const cliDocsUrl = cliDomain ? `${cliDomain}/cli` : undefined

  return (
    <div className="flex w-full max-w-[960px] flex-col gap-5 p-6">
      <AccessPermissionsSection
        appId={appId}
        environments={deployedEnvs}
        policies={policies}
      />
      <AccessChannelsSection
        appId={appId}
        runEnabled={runEnabled}
        webappRows={webappRows}
        cliDomain={cliDomain}
        cliDocsUrl={cliDocsUrl}
      />
      <DeveloperApiSection
        appId={appId}
        apiEnabled={apiEnabled}
        apiUrl={accessConfig?.developerApi?.apiUrl}
        environments={deployedEnvs}
        apiKeys={apiKeys}
      />
    </div>
  )
}
