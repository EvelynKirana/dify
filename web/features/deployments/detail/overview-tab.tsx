'use client'
import type { FC, ReactNode } from 'react'
import { Button } from '@langgenius/dify-ui/button'
import { cn } from '@langgenius/dify-ui/cn'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getAppModeLabel } from '@/app/components/app-sidebar/app-info/app-mode-labels'
import { useRouter } from '@/next/navigation'
import { StatusBadge } from '../components/status-badge'
import { toAppInfoFromOverview } from '../data'
import { useCachedDeploymentAppData } from '../hooks/use-deployment-data'
import { useSourceApps } from '../hooks/use-source-apps'
import { useDeploymentsStore } from '../store'
import { releaseLabel, webappUrl } from '../utils'

type OverviewTabProps = {
  instanceId: string
}

type SwitchableTab = 'deploy' | 'versions' | 'access' | 'settings'

type SectionProps = {
  title: string
  action?: ReactNode
  children: ReactNode
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
  value: ReactNode
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

function overviewDeploymentStatus(status?: string) {
  const normalized = status?.toLowerCase() ?? ''
  if (normalized.includes('deploying') || normalized.includes('pending'))
    return 'deploying'
  if (normalized.includes('fail') || normalized.includes('error'))
    return 'deploy_failed'
  return 'ready'
}

const OverviewTab: FC<OverviewTabProps> = ({ instanceId }) => {
  const { t } = useTranslation('deployments')
  const { t: tCommon } = useTranslation()
  const router = useRouter()
  const { data: appData } = useCachedDeploymentAppData(instanceId)
  const openDeployDrawer = useDeploymentsStore(state => state.openDeployDrawer)
  const { appMap } = useSourceApps()
  const overview = appData?.overview
  const app = toAppInfoFromOverview(overview?.instance) ?? appMap.get(instanceId)
  const overviewApp = overview?.instance
  const deployments = useMemo(
    () => overview?.deployments?.filter(row => row.environment?.id && row.status?.toLowerCase() !== 'undeployed') ?? [],
    [overview?.deployments],
  )

  if (!app)
    return null

  const switchTab = (tab: SwitchableTab) => {
    router.push(`/deployments/${instanceId}/${tab}`)
  }

  const appModeLabel = getAppModeLabel(overviewApp?.mode ?? app.mode, tCommon)
  const webappAccessUrl = webappUrl(overview?.access?.webappUrl)
  const cliUrl = overview?.access?.cliUrl
  const apiKeysCount = overview?.access?.apiKeyCount ?? appData?.accessConfig.developerApi?.apiKeys?.length ?? 0

  return (
    <div className="flex flex-col gap-5 p-6">
      <Section title={t('overview.basicInfo')}>
        <div className="flex flex-col divide-y divide-divider-subtle">
          <InfoRow label={t('overview.name')} value={overviewApp?.name ?? app.name} />
          <InfoRow label={t('overview.description')} value={overviewApp?.description ?? app.description ?? t('overview.emptyValue')} />
          <InfoRow label={t('overview.sourceApp')} value={overviewApp?.sourceAppName ?? app.sourceAppName ?? app.name} />
          <InfoRow label={t('overview.appMode')} value={appModeLabel} />
        </div>
      </Section>

      <Section
        title={t('overview.deploymentStatus')}
        action={(
          <Button size="small" variant="secondary" onClick={() => switchTab('deploy')}>
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
                  const status = overviewDeploymentStatus(row.status)
                  return (
                    <div key={row.environment?.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="flex min-w-0 flex-col">
                        <span className="system-sm-medium text-text-primary">{row.environment?.name || row.environment?.id}</span>
                        <span className="system-xs-regular text-text-tertiary">
                          {releaseLabel(row.release) || t('overview.emptyValue')}
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
          <Button size="small" variant="secondary" onClick={() => switchTab('access')}>
            {t('overview.configureAccess')}
            <span className="i-ri-arrow-right-up-line h-3.5 w-3.5" />
          </Button>
        )}
      >
        <div className="flex flex-col divide-y divide-divider-subtle">
          <AccessOverviewRow
            label={t('overview.webapp')}
            enabled={overview?.access?.accessChannelsEnabled ?? false}
            hint={webappAccessUrl || t('overview.notConfigured')}
          />
          <AccessOverviewRow
            label={t('overview.cli')}
            enabled={overview?.access?.accessChannelsEnabled ?? false}
            hint={cliUrl ?? t('overview.notConfigured')}
          />
          <AccessOverviewRow
            label={t('overview.api')}
            enabled={overview?.access?.developerApiEnabled ?? false}
            hint={overview?.access?.developerApiEnabled
              ? t('overview.apiKeysCount', { count: apiKeysCount })
              : t('overview.notConfigured')}
          />
        </div>
      </Section>
    </div>
  )
}

export default OverviewTab
