'use client'

import type { FC } from 'react'
import type {
  ConsoleEnvironmentSummary,
} from '@/contract/console/deployments'
import { useMemo } from 'react'
import { useDeploymentsStore } from '../store'
import {
  deployedRows,
} from '../utils'
import { AccessChannelsSection } from './access-tab/channels-section'
import { DeveloperApiSection } from './access-tab/developer-api-section'
import { AccessPermissionsSection } from './access-tab/permissions-section'
import { getUrlOrigin } from './access-tab/url'

function uniqueEnvironments(environments: (ConsoleEnvironmentSummary | undefined)[]) {
  return environments.filter((environment, index): environment is ConsoleEnvironmentSummary => {
    if (!environment?.id)
      return false
    return environments.findIndex(candidate => candidate?.id === environment.id) === index
  })
}

type AccessTabProps = {
  instanceId: string
}

const AccessTab: FC<AccessTabProps> = ({ instanceId: appId }) => {
  const appData = useDeploymentsStore(state => state.appData[appId])
  const createdApiToken = useDeploymentsStore(state => state.createdApiToken)
  const clearCreatedApiToken = useDeploymentsStore(state => state.clearCreatedApiToken)
  const generateApiKey = useDeploymentsStore(state => state.generateApiKey)
  const revokeApiKey = useDeploymentsStore(state => state.revokeApiKey)
  const toggleAccessChannel = useDeploymentsStore(state => state.toggleAccessChannel)
  const setEnvironmentAccessPolicy = useDeploymentsStore(state => state.setEnvironmentAccessPolicy)

  const accessConfig = appData?.accessConfig
  const deploymentRows = useMemo(
    () => deployedRows(appData?.environmentDeployments.data),
    [appData?.environmentDeployments.data],
  )
  const policies = useMemo(
    () => accessConfig?.permissions ?? [],
    [accessConfig?.permissions],
  )
  const deployedEnvs = useMemo(
    () => uniqueEnvironments([
      ...deploymentRows.map(row => row.environment),
      ...policies.map(policy => policy.environment),
      ...(accessConfig?.accessChannels?.webappRows?.map(row => row.environment) ?? []),
    ]),
    [accessConfig?.accessChannels?.webappRows, deploymentRows, policies],
  )
  const apiEnabled = accessConfig?.developerApi?.enabled ?? false
  const apiKeys = accessConfig?.developerApi?.apiKeys ?? []
  const handleGenerateApiKey = (environmentId: string) => {
    void (async () => {
      await generateApiKey(appId, environmentId)
    })()
  }
  const handleRevokeApiKey = (environmentId: string, apiKeyId: string) => {
    void (async () => {
      await revokeApiKey(appId, environmentId, apiKeyId)
    })()
  }
  const webappRows = accessConfig?.accessChannels?.webappRows?.filter(row => row.url) ?? []
  const runEnabled = accessConfig?.accessChannels?.enabled ?? false
  const visibleCreatedApiToken = createdApiToken?.appId === appId ? createdApiToken : undefined
  const webappChannelVersion = 0
  const cliDomain = getUrlOrigin(accessConfig?.accessChannels?.cli?.url)
  const cliDocsUrl = cliDomain ? `${cliDomain}/cli` : undefined

  return (
    <div className="flex flex-col gap-5 p-6">
      <AccessPermissionsSection
        appId={appId}
        environments={deployedEnvs}
        policies={policies}
        onSetPolicy={setEnvironmentAccessPolicy}
      />
      <AccessChannelsSection
        runEnabled={runEnabled}
        webappRows={webappRows}
        cliDomain={cliDomain}
        cliDocsUrl={cliDocsUrl}
        onToggle={enabled => toggleAccessChannel(appId, 'webapp', enabled, webappChannelVersion)}
      />
      <DeveloperApiSection
        apiEnabled={apiEnabled}
        environments={deployedEnvs}
        apiKeys={apiKeys}
        createdToken={visibleCreatedApiToken?.token}
        onToggle={enabled => toggleAccessChannel(appId, 'api', enabled, 0)}
        onGenerate={handleGenerateApiKey}
        onRevoke={handleRevokeApiKey}
        onClearCreatedToken={clearCreatedApiToken}
      />
    </div>
  )
}

export default AccessTab
