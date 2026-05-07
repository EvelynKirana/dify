'use client'

import type { ConsoleEnvironmentSummary, DeveloperAPIKeySummary } from '@/features/deployments/types'
import { Switch } from '@langgenius/dify-ui/switch'
import { useTranslation } from 'react-i18next'
import { ApiKeyGenerateMenu, ApiKeyRow } from './api-keys'
import { CopyPill, Section } from './common'

type DeveloperApiSectionProps = {
  apiEnabled: boolean
  apiUrl?: string
  environments: ConsoleEnvironmentSummary[]
  apiKeys: DeveloperAPIKeySummary[]
  createdToken?: string
  onToggle: (enabled: boolean) => void
  onGenerate: (environmentId: string) => void
  onCopyApiKey: (apiKeyId: string) => Promise<string>
  onRevoke: (apiKeyId: string) => void
  onClearCreatedToken: () => void
}

export function DeveloperApiSection({
  apiEnabled,
  apiUrl,
  environments,
  apiKeys,
  createdToken,
  onToggle,
  onGenerate,
  onCopyApiKey,
  onRevoke,
  onClearCreatedToken,
}: DeveloperApiSectionProps) {
  const { t } = useTranslation('deployments')

  return (
    <Section
      title={t('access.api.developerTitle')}
      description={t('access.api.description')}
      action={(
        <Switch
          checked={apiEnabled}
          onCheckedChange={onToggle}
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
                  environments={environments}
                  onGenerate={onGenerate}
                />
              </div>
              {createdToken && (
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
                      onClick={onClearCreatedToken}
                      aria-label={t('access.api.dismissToken')}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-state-base-hover hover:text-text-secondary"
                    >
                      <span className="i-ri-close-line h-3.5 w-3.5" />
                    </button>
                  </div>
                  <CopyPill
                    label={t('access.api.newTokenLabel')}
                    value={createdToken}
                  />
                </div>
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
                    <div className="flex flex-col divide-y divide-divider-subtle">
                      {apiKeys.map((apiKey) => {
                        const environmentId = apiKey.environmentId ?? apiKey.environment?.id
                        if (!apiKey.id || !environmentId)
                          return null
                        return (
                          <ApiKeyRow
                            key={apiKey.id}
                            apiKey={apiKey}
                            onCopy={onCopyApiKey}
                            onRevoke={onRevoke}
                          />
                        )
                      })}
                    </div>
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
