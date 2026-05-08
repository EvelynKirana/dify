'use client'

import type {
  AccessSubject,
  ConsoleEnvironment,
  DeveloperApiKeyRow,
  EnvironmentAccessRow,
} from '@dify/contracts/enterprise/types.gen'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
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

type DeveloperApiAccessSectionProps = {
  appId: string
  apiEnabled: boolean
  apiUrl?: string
  environments: ConsoleEnvironment[]
  apiKeys: DeveloperApiKeyRow[]
}

function DeveloperApiAccessSection({
  appId,
  apiEnabled,
  apiUrl,
  environments,
  apiKeys,
}: DeveloperApiAccessSectionProps) {
  const [createdApiToken, setCreatedApiToken] = useState<{
    appId: string
    token: string
  }>()
  const generateApiKey = useMutation(consoleQuery.enterprise.appDeploy.createDeveloperApiKey.mutationOptions())
  const toggleDeveloperAPI = useMutation(consoleQuery.enterprise.appDeploy.updateDeveloperApi.mutationOptions())

  function createApiKeyLabel(environmentId: string) {
    const existingCount = apiKeys.filter(key =>
      key.environment?.id === environmentId,
    ).length
    const name = environments.find(env => env.id === environmentId)?.name ?? 'env'

    return `${name}-key-${String(existingCount + 1).padStart(3, '0')}`
  }

  function handleGenerateApiKey(environmentId: string) {
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

  const visibleCreatedApiToken = createdApiToken?.appId === appId
    ? createdApiToken.token
    : undefined

  return (
    <DeveloperApiSection
      appId={appId}
      apiEnabled={apiEnabled}
      apiUrl={apiUrl}
      environments={environments}
      apiKeys={apiKeys}
      createdToken={visibleCreatedApiToken}
      onToggle={enabled => toggleDeveloperAPI.mutate({
        params: { appInstanceId: appId },
        body: { enabled },
      })}
      onGenerate={handleGenerateApiKey}
      onClearCreatedToken={() => setCreatedApiToken(undefined)}
    />
  )
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
  const toggleAccessChannel = useMutation(consoleQuery.enterprise.appDeploy.updateAccessChannels.mutationOptions())
  const setEnvironmentAccessPolicy = useMutation(consoleQuery.enterprise.appDeploy.updateEnvironmentAccessPolicy.mutationOptions())

  const deploymentRows = deployedRows(environmentDeployments?.data)
  const policies = accessConfig?.permissions ?? EMPTY_ACCESS_PERMISSIONS
  const deployedEnvs = uniqueEnvironments([
    ...deploymentRows.map(row => row.environment),
    ...policies.map(policy => policy.environment),
    ...(accessConfig?.accessChannels?.webappRows?.map(row => row.environment) ?? []),
  ])
  const apiEnabled = accessConfig?.developerApi?.enabled ?? false
  const apiKeys = accessConfig?.developerApi?.apiKeys ?? []
  const handleSetEnvironmentAccessPolicy = async (
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
      <DeveloperApiAccessSection
        appId={appId}
        apiEnabled={apiEnabled}
        apiUrl={accessConfig?.developerApi?.apiUrl}
        environments={deployedEnvs}
        apiKeys={apiKeys}
      />
    </div>
  )
}
