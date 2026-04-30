'use client'

import type { FC } from 'react'
import type {
  AccessPermission,
  AccessSubject,
  ConsoleEnvironmentSummary,
} from '@/contract/console/deployments'
import { useMemo, useState } from 'react'
import { useCachedDeploymentAppData } from '../hooks/use-deployment-data'
import {
  useGenerateDeploymentApiKey,
  useRevokeDeploymentApiKey,
  useSetEnvironmentAccessPolicy,
  useToggleDeploymentAccessChannel,
} from '../hooks/use-deployment-mutations'
import {
  deployedRows,
} from '../utils'
import { AccessChannelsSection } from './access-tab/channels-section'
import { DeveloperApiSection } from './access-tab/developer-api-section'
import { AccessPermissionsSection } from './access-tab/permissions-section'
import { getUrlOrigin } from './access-tab/url'

const EMPTY_ACCESS_PERMISSIONS: AccessPermission[] = []

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
  const { data: appData } = useCachedDeploymentAppData(appId)
  const [createdApiToken, setCreatedApiToken] = useState<{
    appId: string
    token: string
  }>()
  const generateApiKey = useGenerateDeploymentApiKey()
  const revokeApiKey = useRevokeDeploymentApiKey()
  const toggleAccessChannel = useToggleDeploymentAccessChannel()
  const setEnvironmentAccessPolicy = useSetEnvironmentAccessPolicy()

  const accessConfig = appData?.accessConfig
  const deploymentRows = useMemo(
    () => deployedRows(appData?.environmentDeployments.data),
    [appData?.environmentDeployments.data],
  )
  const policies = accessConfig?.permissions ?? EMPTY_ACCESS_PERMISSIONS
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
    generateApiKey.mutate(
      { appId, environmentId },
      {
        onSuccess: (response) => {
          if (response.apiToken?.token)
            setCreatedApiToken({ appId, token: response.apiToken.token })
        },
      },
    )
  }
  const handleRevokeApiKey = (environmentId: string, apiKeyId: string) => {
    revokeApiKey.mutate({ appId, environmentId, apiKeyId })
  }
  const handleSetEnvironmentAccessPolicy = async (
    appId: string,
    environmentId: string,
    accessMode: string,
    subjects: AccessSubject[],
  ) => {
    await setEnvironmentAccessPolicy.mutateAsync({
      appId,
      environmentId,
      accessMode,
      subjects,
    })
  }
  const webappRows = accessConfig?.accessChannels?.webappRows?.filter(row => row.url) ?? []
  const runEnabled = accessConfig?.accessChannels?.enabled ?? false
  const visibleCreatedApiToken = createdApiToken?.appId === appId
    ? createdApiToken.token
    : undefined
  const cliDomain = getUrlOrigin(accessConfig?.accessChannels?.cli?.url)
  const cliDocsUrl = cliDomain ? `${cliDomain}/cli` : undefined

  return (
    <div className="flex flex-col gap-5 p-6">
      <AccessPermissionsSection
        appId={appId}
        environments={deployedEnvs}
        policies={policies}
        onSetPolicy={handleSetEnvironmentAccessPolicy}
      />
      <AccessChannelsSection
        runEnabled={runEnabled}
        webappRows={webappRows}
        cliDomain={cliDomain}
        cliDocsUrl={cliDocsUrl}
        onToggle={enabled => toggleAccessChannel.mutate({ appId, channel: 'webapp', enabled })}
      />
      <DeveloperApiSection
        apiEnabled={apiEnabled}
        environments={deployedEnvs}
        apiKeys={apiKeys}
        createdToken={visibleCreatedApiToken}
        onToggle={enabled => toggleAccessChannel.mutate({ appId, channel: 'api', enabled })}
        onGenerate={handleGenerateApiKey}
        onRevoke={handleRevokeApiKey}
        onClearCreatedToken={() => setCreatedApiToken(undefined)}
      />
    </div>
  )
}

export default AccessTab
