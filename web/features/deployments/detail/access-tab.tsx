'use client'

import type { FC } from 'react'
import type {
  AccessPermission,
  AccessSubject,
  ConsoleEnvironmentSummary,
} from '@/features/deployments/types'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { consoleQuery } from '@/service/client'
import {
  useGenerateDeploymentApiKey,
  useRevokeDeploymentApiKey,
  useSetEnvironmentAccessPolicy,
  useToggleDeploymentAccessChannel,
  useToggleDeploymentDeveloperAPI,
} from '../hooks/use-deployment-mutations'
import { deploymentEnvironmentDeploymentsQueryOptions } from '../queries'
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
  const appInput = { params: { appInstanceId: appId } }
  const { data: accessConfig } = useQuery(consoleQuery.deployments.accessConfig.queryOptions({
    input: appInput,
  }))
  const { data: environmentDeployments } = useQuery(deploymentEnvironmentDeploymentsQueryOptions(appId))
  const [createdApiToken, setCreatedApiToken] = useState<{
    appId: string
    token: string
  }>()
  const generateApiKey = useGenerateDeploymentApiKey()
  const revokeApiKey = useRevokeDeploymentApiKey()
  const toggleAccessChannel = useToggleDeploymentAccessChannel()
  const toggleDeveloperAPI = useToggleDeploymentDeveloperAPI()
  const setEnvironmentAccessPolicy = useSetEnvironmentAccessPolicy()

  const deploymentRows = useMemo(
    () => deployedRows(environmentDeployments?.data),
    [environmentDeployments?.data],
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
  const createApiKeyLabel = (environmentId: string) => {
    const existingCount = apiKeys.filter(key =>
      key.environment?.id === environmentId,
    ).length
    const name = deployedEnvs.find(env => env.id === environmentId)?.name ?? 'env'

    return `${name}-key-${String(existingCount + 1).padStart(3, '0')}`
  }
  const handleGenerateApiKey = (environmentId: string) => {
    generateApiKey.mutate(
      {
        params: {
          appInstanceId: appId,
        },
        body: {
          environmentId,
          name: createApiKeyLabel(environmentId),
        },
      },
      {
        onSuccess: (response) => {
          if (response.token)
            setCreatedApiToken({ appId, token: response.token })
        },
      },
    )
  }
  const handleRevokeApiKey = (_environmentId: string, apiKeyId: string) => {
    revokeApiKey.mutate({
      params: {
        appInstanceId: appId,
        apiKeyId,
      },
    })
  }
  const handleSetEnvironmentAccessPolicy = async (
    appId: string,
    environmentId: string,
    accessMode: string,
    subjects: AccessSubject[],
  ) => {
    await setEnvironmentAccessPolicy.mutateAsync({
      params: {
        appInstanceId: appId,
        environmentId,
      },
      body: {
        accessMode,
        subjects,
      },
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
        onToggle={enabled => toggleAccessChannel.mutate({
          params: { appInstanceId: appId },
          body: { enabled },
        })}
      />
      <DeveloperApiSection
        apiEnabled={apiEnabled}
        environments={deployedEnvs}
        apiKeys={apiKeys}
        createdToken={visibleCreatedApiToken}
        onToggle={enabled => toggleDeveloperAPI.mutate({
          params: { appInstanceId: appId },
          body: { enabled },
        })}
        onGenerate={handleGenerateApiKey}
        onRevoke={handleRevokeApiKey}
        onClearCreatedToken={() => setCreatedApiToken(undefined)}
      />
    </div>
  )
}

export default AccessTab
