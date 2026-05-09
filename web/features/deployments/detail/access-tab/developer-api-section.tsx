'use client'

import type {
  ConsoleEnvironment,
  EnvironmentAccessRow,
} from '@dify/contracts/enterprise/types.gen'
import { Switch } from '@langgenius/dify-ui/switch'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { consoleQuery } from '@/service/client'
import { Section } from '../common'
import { ApiKeyGenerateMenu, ApiKeyList } from './api-keys'
import { CopyPill } from './common'

type DeveloperApiSectionProps = {
  appInstanceId: string
}

type CreatedApiToken = {
  appInstanceId: string
  token: string
}

function permissionEnvironment(row: EnvironmentAccessRow): ConsoleEnvironment | undefined {
  return row.environment?.id ? row.environment : undefined
}

function DeveloperApiSwitch({ appInstanceId, checked }: {
  appInstanceId: string
  checked: boolean
}) {
  const toggleDeveloperAPI = useMutation(consoleQuery.enterprise.appDeploy.updateDeveloperApi.mutationOptions())

  return (
    <Switch
      checked={checked}
      onCheckedChange={(enabled) => {
        toggleDeveloperAPI.mutate({
          params: { appInstanceId },
          body: { enabled },
        })
      }}
    />
  )
}

function CreatedApiTokenCard({ token, onDismiss }: {
  token: string
  onDismiss: () => void
}) {
  const { t } = useTranslation('deployments')

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-components-panel-border bg-components-panel-bg-blur p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="system-sm-medium text-text-primary">
            {t('access.api.newTokenTitle')}
          </span>
          <span className="system-xs-regular text-text-tertiary">
            {t('access.api.newTokenDescription')}
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('access.api.dismissToken')}
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-state-base-hover hover:text-text-secondary"
        >
          <span className="i-ri-close-line size-3.5" />
        </button>
      </div>
      <CopyPill
        label={t('access.api.newTokenLabel')}
        value={token}
      />
    </div>
  )
}

export function DeveloperApiSection({
  appInstanceId,
}: DeveloperApiSectionProps) {
  const { t } = useTranslation('deployments')
  const [createdApiToken, setCreatedApiToken] = useState<CreatedApiToken>()
  const { data: accessConfig } = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceAccess.queryOptions({
    input: {
      params: { appInstanceId },
    },
  }))
  const apiEnabled = accessConfig?.developerApi?.enabled ?? false
  const apiUrl = accessConfig?.developerApi?.apiUrl
  const apiKeys = accessConfig?.developerApi?.apiKeys ?? []
  const environments = accessConfig?.permissions
    ?.map(permissionEnvironment)
    .filter((environment): environment is ConsoleEnvironment => Boolean(environment)) ?? []
  const visibleCreatedApiToken = createdApiToken?.appInstanceId === appInstanceId
    ? createdApiToken.token
    : undefined

  return (
    <Section
      title={t('access.api.developerTitle')}
      description={t('access.api.description')}
      action={(
        <DeveloperApiSwitch
          appInstanceId={appInstanceId}
          checked={apiEnabled}
        />
      )}
    >
      {apiEnabled
        ? (
            <div className="flex flex-col gap-2">
              {apiUrl && (
                <CopyPill
                  label={t('access.api.endpoint')}
                  value={apiUrl}
                />
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span className="system-sm-medium text-text-primary">
                    {t('access.api.backendTitle')}
                  </span>
                  <span className="system-xs-regular text-text-tertiary">
                    {t('access.api.keyList')}
                  </span>
                </div>
                <ApiKeyGenerateMenu
                  appInstanceId={appInstanceId}
                  environments={environments}
                  apiKeys={apiKeys}
                  onCreatedToken={token => setCreatedApiToken({ appInstanceId, token })}
                />
              </div>
              {visibleCreatedApiToken && (
                <CreatedApiTokenCard
                  token={visibleCreatedApiToken}
                  onDismiss={() => setCreatedApiToken(undefined)}
                />
              )}
              {apiKeys.length === 0
                ? (
                    <div className="rounded-lg border border-dashed border-components-panel-border bg-components-panel-bg-blur px-4 py-6 text-center system-sm-regular text-text-tertiary">
                      {environments.length === 0
                        ? t('access.api.empty')
                        : t('access.api.noKeys')}
                    </div>
                  )
                : (
                    <ApiKeyList
                      appInstanceId={appInstanceId}
                      apiKeys={apiKeys}
                    />
                  )}
            </div>
          )
        : (
            <div className="system-xs-regular text-text-tertiary">
              {t('access.api.disabled')}
            </div>
          )}
    </Section>
  )
}
