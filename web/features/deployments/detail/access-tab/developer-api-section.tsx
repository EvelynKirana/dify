'use client'

import { Switch } from '@langgenius/dify-ui/switch'
import { useMutation } from '@tanstack/react-query'
import { useAtomValue, useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { consoleQuery } from '@/service/client'
import { createdDeveloperApiTokenAtom } from '../../store'
import { ApiKeyGenerateMenu, ApiKeyList } from './api-keys'
import { CopyPill, Section } from './common'
import { useAccessEnvironmentScope } from './use-access-environment-scope'

type DeveloperApiSectionProps = {
  appId: string
}

function DeveloperApiSwitch({ appId, checked }: {
  appId: string
  checked: boolean
}) {
  const toggleDeveloperAPI = useMutation(consoleQuery.enterprise.appDeploy.updateDeveloperApi.mutationOptions())

  return (
    <Switch
      checked={checked}
      onCheckedChange={(enabled) => {
        toggleDeveloperAPI.mutate({
          params: { appInstanceId: appId },
          body: { enabled },
        })
      }}
    />
  )
}

function CreatedApiTokenCard({ appId }: {
  appId: string
}) {
  const { t } = useTranslation('deployments')
  const createdApiToken = useAtomValue(createdDeveloperApiTokenAtom)
  const setCreatedApiToken = useSetAtom(createdDeveloperApiTokenAtom)
  const visibleCreatedApiToken = createdApiToken?.appId === appId
    ? createdApiToken.token
    : undefined

  if (!visibleCreatedApiToken)
    return null

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
          onClick={() => setCreatedApiToken(undefined)}
          aria-label={t('access.api.dismissToken')}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-state-base-hover hover:text-text-secondary"
        >
          <span className="i-ri-close-line h-3.5 w-3.5" />
        </button>
      </div>
      <CopyPill
        label={t('access.api.newTokenLabel')}
        value={visibleCreatedApiToken}
      />
    </div>
  )
}

export function DeveloperApiSection({
  appId,
}: DeveloperApiSectionProps) {
  const { t } = useTranslation('deployments')
  const { accessConfig, environments } = useAccessEnvironmentScope(appId)
  const apiEnabled = accessConfig?.developerApi?.enabled ?? false
  const apiUrl = accessConfig?.developerApi?.apiUrl
  const apiKeys = accessConfig?.developerApi?.apiKeys ?? []

  return (
    <Section
      title={t('access.api.developerTitle')}
      description={t('access.api.description')}
      action={(
        <DeveloperApiSwitch
          appId={appId}
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
                  appId={appId}
                  environments={environments}
                  apiKeys={apiKeys}
                />
              </div>
              <CreatedApiTokenCard appId={appId} />
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
                      appId={appId}
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
