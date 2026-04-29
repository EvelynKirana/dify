'use client'

import type { FC } from 'react'
import type {
  APIToken,
  ConsoleEnvironmentSummary,
  DeveloperAPIKeySummary,
} from '@/contract/console/deployments'
import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import { consoleQuery } from '@/service/client'
import { useDeploymentsStore } from '../store'
import {
  deployedRows,
  environmentName,
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
    () => deployedRows(appData?.environmentDeployments.environmentDeployments),
    [appData?.environmentDeployments.environmentDeployments],
  )
  const policies = useMemo(
    () => accessConfig?.userAccess?.environmentPolicies ?? [],
    [accessConfig?.userAccess?.environmentPolicies],
  )
  const deployedEnvs = useMemo(
    () => uniqueEnvironments([
      ...deploymentRows.map(row => row.environment),
      ...policies.map(policy => policy.environment),
      ...(accessConfig?.webapp?.rows?.map(row => row.environment) ?? []),
    ]),
    [accessConfig?.webapp?.rows, deploymentRows, policies],
  )
  const apiEnabled = accessConfig?.developerApi?.enabled ?? false
  const apiTokenEnvironments = useMemo(
    () => deployedEnvs.filter((env): env is ConsoleEnvironmentSummary & { id: string } => Boolean(env.id)),
    [deployedEnvs],
  )
  const apiTokenQueries = useQueries({
    queries: apiTokenEnvironments.map(env => consoleQuery.deployments.environmentAPITokens.queryOptions({
      input: {
        params: {
          appId,
          environmentId: env.id,
        },
      },
      enabled: apiEnabled,
      staleTime: 30 * 1000,
    })),
  })
  const apiTokenRows = apiTokenQueries.flatMap((query, index): DeveloperAPIKeySummary[] => {
    const env = apiTokenEnvironments[index]
    return query.data?.data?.map((token: APIToken) => ({
      ...token,
      environmentName: token.environmentId ? environmentName(env) : undefined,
    })) ?? []
  })
  const apiKeys = apiTokenQueries.some(query => query.isSuccess)
    ? apiTokenRows
    : accessConfig?.developerApi?.apiKeys ?? []
  const refetchApiTokens = async () => {
    await Promise.all(apiTokenQueries.map(query => query.refetch()))
  }
  const handleGenerateApiKey = (environmentId: string) => {
    void (async () => {
      await generateApiKey(appId, environmentId)
      await refetchApiTokens()
    })()
  }
  const handleRevokeApiKey = (environmentId: string, apiKeyId: string) => {
    void (async () => {
      await revokeApiKey(appId, environmentId, apiKeyId)
      await refetchApiTokens()
    })()
  }
  const webappRows = accessConfig?.webapp?.rows?.filter(row => row.url) ?? []
  const runEnabled = accessConfig?.webapp?.enabled ?? false
  const visibleCreatedApiToken = createdApiToken?.appId === appId ? createdApiToken : undefined
  const webappChannelVersion = policies.find(policy => policy.effectivePolicy?.channel === 'webapp')?.effectivePolicy?.version ?? 0
  const cliDomain = getUrlOrigin(accessConfig?.cli?.url)
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
