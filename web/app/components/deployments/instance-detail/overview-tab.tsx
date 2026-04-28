'use client'
import type { FC } from 'react'
import { Button } from '@langgenius/dify-ui/button'
import { cn } from '@langgenius/dify-ui/cn'
import * as React from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getAppModeLabel } from '@/app/components/app-sidebar/app-info/app-mode-labels'
import { deployedRows, deploymentStatus, environmentName, formatDate, releaseLabel, webappUrl } from '../api-utils'
import { StatusBadge } from '../status-badge'
import { useDeploymentsStore } from '../store'
import { useSourceApps } from '../use-source-apps'

type OverviewTabProps = {
  instanceId: string
  onSwitchTab?: (tab: 'deploy' | 'versions' | 'access' | 'settings') => void
}

type SectionProps = {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}

const Section: FC<SectionProps> = ({ title, action, children }) => (
  <div className="flex flex-col gap-3 rounded-xl border border-components-panel-border bg-components-panel-bg p-4">
    <div className="flex items-center justify-between">
      <div className="system-sm-semibold text-text-primary">{title}</div>
      {action}
    </div>
    {children}
  </div>
)

type InfoRowProps = {
  label: string
  value: React.ReactNode
  mono?: boolean
}

const InfoRow: FC<InfoRowProps> = ({ label, value, mono }) => (
  <div className="flex items-start gap-3 py-1.5">
    <span className="w-32 shrink-0 system-xs-regular text-text-tertiary">{label}</span>
    <span className={cn('min-w-0 flex-1 system-sm-regular text-text-primary', mono && 'font-mono')}>{value}</span>
  </div>
)

type AccessOverviewRowProps = {
  label: string
  enabled: boolean
  hint?: string
}

const AccessOverviewRow: FC<AccessOverviewRowProps> = ({ label, enabled, hint }) => {
  const { t } = useTranslation('deployments')

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex min-w-0 flex-col">
        <span className="system-sm-medium text-text-primary">{label}</span>
        {hint && <span className="truncate system-xs-regular text-text-tertiary">{hint}</span>}
      </div>
      <span className={cn(
        'inline-flex shrink-0 items-center gap-1.5 system-xs-medium',
        enabled ? 'text-util-colors-green-green-700' : 'text-text-tertiary',
      )}
      >
        <span className={cn(
          'h-1.5 w-1.5 rounded-full',
          enabled ? 'bg-util-colors-green-green-500' : 'bg-text-quaternary',
        )}
        />
        {enabled ? t('overview.enabled') : t('overview.disabled')}
      </span>
    </div>
  )
}

const OverviewTab: FC<OverviewTabProps> = ({ instanceId, onSwitchTab }) => {
  const { t } = useTranslation('deployments')
  const { t: tCommon } = useTranslation()
  const appData = useDeploymentsStore(state => state.appData[instanceId])
  const openDeployDrawer = useDeploymentsStore(state => state.openDeployDrawer)
  const { appMap } = useSourceApps()
  const app = appMap.get(instanceId)

  const deployments = useMemo(
    () => deployedRows(appData?.environmentDeployments.environmentDeployments),
    [appData?.environmentDeployments.environmentDeployments],
  )

  if (!app)
    return null

  const appModeLabel = getAppModeLabel(app.mode, tCommon)
  const webappRow = appData?.accessConfig.webapp?.rows?.find(row => row.url)
  const webappAccessUrl = webappUrl(webappRow?.url)
  const cliUrl = appData?.accessConfig.cli?.url
  const apiKeysCount = appData?.accessConfig.developerApi?.apiKeys?.length ?? 0

  return (
    <div className="flex flex-col gap-5 p-6">
      <Section title={t('overview.basicInfo')}>
        <div className="flex flex-col divide-y divide-divider-subtle">
          <InfoRow label={t('overview.name')} value={app.name} />
          <InfoRow label={t('overview.description')} value={app.description ?? t('overview.emptyValue')} />
          <InfoRow label={t('overview.sourceApp')} value={app.name} />
          <InfoRow label={t('overview.appMode')} value={appModeLabel} />
        </div>
      </Section>

      <Section
        title={t('overview.deploymentStatus')}
        action={(
          <Button size="small" variant="secondary" onClick={() => onSwitchTab?.('deploy')}>
            {t('overview.viewDeployments')}
            <span className="i-ri-arrow-right-up-line h-3.5 w-3.5" />
          </Button>
        )}
      >
        {deployments.length === 0
          ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-components-panel-border bg-components-panel-bg-blur px-4 py-8 text-center">
                <span className="i-ri-rocket-line h-5 w-5 text-text-quaternary" />
                <div className="system-sm-regular text-text-tertiary">{t('overview.notDeployedYet')}</div>
                <Button size="small" variant="primary" onClick={() => openDeployDrawer({ appId: app.id })}>
                  {t('overview.deploy')}
                </Button>
              </div>
            )
          : (
              <div className="flex flex-col divide-y divide-divider-subtle">
                {deployments.map((row) => {
                  const status = deploymentStatus(row)
                  return (
                    <div key={row.environment?.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="flex min-w-0 flex-col">
                        <span className="system-sm-medium text-text-primary">{environmentName(row.environment)}</span>
                        <span className="system-xs-regular text-text-tertiary">
                          {releaseLabel(row.observedRuntime?.release || row.pendingDeployment?.release)}
                          {' · '}
                          {formatDate(row.instance?.lastDeployedAt || row.instance?.lastReadyAt)}
                        </span>
                      </div>
                      <StatusBadge status={status} />
                    </div>
                  )
                })}
              </div>
            )}
      </Section>

      <Section
        title={t('overview.accessStatus')}
        action={(
          <Button size="small" variant="secondary" onClick={() => onSwitchTab?.('access')}>
            {t('overview.configureAccess')}
            <span className="i-ri-arrow-right-up-line h-3.5 w-3.5" />
          </Button>
        )}
      >
        <div className="flex flex-col divide-y divide-divider-subtle">
          <AccessOverviewRow
            label={t('overview.webapp')}
            enabled={appData?.accessConfig.webapp?.enabled ?? false}
            hint={webappAccessUrl || t('overview.notConfigured')}
          />
          <AccessOverviewRow
            label={t('overview.cli')}
            enabled={appData?.accessConfig.cli?.enabled ?? false}
            hint={cliUrl ?? t('overview.notConfigured')}
          />
          <AccessOverviewRow
            label={t('overview.api')}
            enabled={appData?.accessConfig.developerApi?.enabled ?? false}
            hint={appData?.accessConfig.developerApi?.enabled
              ? t('overview.apiKeysCount', { count: apiKeysCount })
              : t('overview.notConfigured')}
          />
        </div>
      </Section>
    </div>
  )
}

export default OverviewTab
