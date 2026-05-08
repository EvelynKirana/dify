'use client'

import type { WebAppAccessRow } from '@dify/contracts/enterprise/types.gen'
import { Switch } from '@langgenius/dify-ui/switch'
import { useTranslation } from 'react-i18next'
import { environmentName, webappUrl } from '../../utils'
import { CopyPill, EndpointRow, Section } from './common'

type AccessChannelsSectionProps = {
  runEnabled: boolean
  webappRows: WebAppAccessRow[]
  cliDomain?: string
  cliDocsUrl?: string
  onToggle: (enabled: boolean) => void
}

export function AccessChannelsSection({
  runEnabled,
  webappRows,
  cliDomain,
  cliDocsUrl,
  onToggle,
}: AccessChannelsSectionProps) {
  const { t } = useTranslation('deployments')

  return (
    <Section
      title={t('access.channels.title')}
      description={t('access.channels.description')}
      action={(
        <Switch
          checked={runEnabled}
          onCheckedChange={onToggle}
        />
      )}
    >
      {runEnabled
        ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="system-sm-medium text-text-primary">
                      {t('access.runAccess.webapp')}
                    </div>
                    <span className="inline-flex h-5 items-center rounded-full bg-state-success-hover px-1.5 system-2xs-medium text-state-success-solid">
                      {t('access.channels.followPermission')}
                    </span>
                  </div>
                  <div className="system-xs-regular text-text-tertiary">
                    {t('access.runAccess.webappDesc')}
                  </div>
                  {webappRows.length > 0
                    ? (
                        <div className="flex flex-col gap-2">
                          {webappRows.map((row) => {
                            const endpointUrl = webappUrl(row.url)

                            return (
                              <EndpointRow
                                key={`webapp-${row.environment?.id ?? row.url}`}
                                envName={environmentName(row.environment)}
                                label={t('access.runAccess.urlLabel')}
                                value={endpointUrl}
                                openLabel={t('access.runAccess.openWebapp')}
                              />
                            )
                          })}
                        </div>
                      )
                    : (
                        <div className="rounded-lg border border-dashed border-components-panel-border bg-components-panel-bg-blur px-4 py-6 text-center system-sm-regular text-text-tertiary">
                          {t('access.runAccess.webappEmpty')}
                        </div>
                      )}
                </div>
                <div className="flex flex-col gap-1.5 border-t border-divider-subtle pt-3">
                  <div className="flex items-center gap-2">
                    <div className="system-sm-medium text-text-primary">
                      {t('access.cli.title')}
                    </div>
                    <span className="inline-flex h-5 items-center rounded-full bg-state-success-hover px-1.5 system-2xs-medium text-state-success-solid">
                      {t('access.channels.followPermission')}
                    </span>
                  </div>
                  <div className="system-xs-regular text-text-tertiary">
                    {t('access.cli.description')}
                  </div>
                  {cliDomain
                    ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <CopyPill
                            label={t('access.cli.domain')}
                            value={cliDomain}
                            className="min-w-[260px] flex-1"
                          />
                          <a
                            href={cliDocsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-components-button-secondary-border bg-components-button-secondary-bg px-3 system-sm-medium text-components-button-secondary-text hover:bg-components-button-secondary-bg-hover"
                          >
                            <span className="i-ri-download-cloud-2-line h-3.5 w-3.5" />
                            {t('access.cli.install')}
                          </a>
                          <a
                            href={cliDocsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-components-button-secondary-border bg-components-button-secondary-bg px-3 system-sm-medium text-components-button-secondary-text hover:bg-components-button-secondary-bg-hover"
                          >
                            <span className="i-ri-book-open-line h-3.5 w-3.5" />
                            {t('access.cli.docs')}
                          </a>
                        </div>
                      )
                    : (
                        <div className="system-xs-regular text-text-tertiary">
                          {t('access.cli.empty')}
                        </div>
                      )}
                </div>
              </div>
            </div>
          )
        : (
            <div className="system-xs-regular text-text-tertiary">
              {t('access.channels.disabled')}
            </div>
          )}
    </Section>
  )
}
