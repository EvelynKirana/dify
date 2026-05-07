'use client'

import type {
  AccessPermission,
  AccessSubject,
  ConsoleEnvironmentSummary,
} from '@/features/deployments/types'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { consoleClient, consoleQuery } from '@/service/client'
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
  const [createdApiToken, setCreatedApiToken] = useState<{
    appId: string
    token: string
  }>()
  const generateApiKey = useMutation(consoleQuery.enterprise.appDeploy.createDeveloperApiKey.mutationOptions())
  const revokeApiKey = useMutation(consoleQuery.enterprise.appDeploy.deleteDeveloperApiKey.mutationOptions())
  const toggleAccessChannel = useMutation(consoleQuery.enterprise.appDeploy.updateAccessChannels.mutationOptions())
  const toggleDeveloperAPI = useMutation(consoleQuery.enterprise.appDeploy.updateDeveloperApi.mutationOptions())
  const setEnvironmentAccessPolicy = useMutation(consoleQuery.enterprise.appDeploy.updateEnvironmentAccessPolicy.mutationOptions())

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
  const handleCopyApiKey = async (apiKeyId: string) => {
    const response = await consoleClient.enterprise.appDeploy.revealDeveloperApiKey({
      params: {
        appInstanceId: appId,
        apiKeyId,
      },
    })
    if (!response.token)
      throw new Error('Reveal developer API key did not return a token.')
    return response.token
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
    <div className="flex w-full max-w-[960px] flex-col gap-5 p-6">
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
        apiUrl={accessConfig?.developerApi?.apiUrl}
        environments={deployedEnvs}
        apiKeys={apiKeys}
        createdToken={visibleCreatedApiToken}
        onToggle={enabled => toggleDeveloperAPI.mutate({
          params: { appInstanceId: appId },
          body: { enabled },
        })}
        onGenerate={handleGenerateApiKey}
        onCopyApiKey={handleCopyApiKey}
        onRevoke={handleRevokeApiKey}
        onClearCreatedToken={() => setCreatedApiToken(undefined)}
      />
    </div>
  )
}
