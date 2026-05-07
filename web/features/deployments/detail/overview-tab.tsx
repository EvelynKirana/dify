'use client'
import type { ReactNode } from 'react'
import { Button } from '@langgenius/dify-ui/button'
import { cn } from '@langgenius/dify-ui/cn'
import { useQuery } from '@tanstack/react-query'
import { useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { getAppModeLabel } from '@/app/components/app-sidebar/app-info/app-mode-labels'
import Link from '@/next/link'
import { consoleQuery } from '@/service/client'
import { StatusBadge } from '../components/status-badge'
import { DEPLOYMENT_PAGE_SIZE } from '../data'
import { openDeployDrawerAtom } from '../store'
import {
  releaseLabel,
  webappUrl,
} from '../utils'

function Section({ title, action, children }: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-components-panel-border bg-components-panel-bg p-4">
      <div className="flex items-center justify-between">
        <div className="system-sm-semibold text-text-primary">{title}</div>
        {action}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value, mono }: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="w-32 shrink-0 system-xs-regular text-text-tertiary">{label}</span>
      <span className={cn('min-w-0 flex-1 system-sm-regular text-text-primary', mono && 'font-mono')}>{value}</span>
    </div>
  )
}

type AccessOverviewRowProps = {
  label: string
  enabled: boolean
  hint?: string
  meta?: string
}

function AccessOverviewRow({ label, enabled, hint, meta }: AccessOverviewRowProps) {
  const { t } = useTranslation('deployments')

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex min-w-0 flex-col">
        <span className="system-sm-medium text-text-primary">{label}</span>
        {hint && <span className="system-xs-regular break-all text-text-tertiary">{hint}</span>}
        {meta && <span className="system-xs-regular text-text-quaternary">{meta}</span>}
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

function overviewDeploymentStatus(status?: string): 'deploying' | 'deploy_failed' | 'ready' {
  const normalized = status?.toLowerCase() ?? ''
  if (normalized.includes('deploying') || normalized.includes('pending'))
    return 'deploying'
  if (normalized.includes('fail') || normalized.includes('error'))
    return 'deploy_failed'
  return 'ready'
}

export function OverviewTab({ instanceId }: {
  instanceId: string
}) {
  const { t } = useTranslation('deployments')
  const { t: tCommon } = useTranslation()
  const input = { params: { appInstanceId: instanceId } }
  const { data: overview } = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceOverview.queryOptions({
    input,
  }))
  const { data: releaseHistory } = useQuery(consoleQuery.enterprise.appDeploy.listReleases.queryOptions({
    input: {
      ...input,
      query: {
        pageNumber: 1,
        resultsPerPage: DEPLOYMENT_PAGE_SIZE,
      },
    },
  }))
  const { data: accessConfig } = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceAccess.queryOptions({
    input,
  }))
  const openDeployDrawer = useSetAtom(openDeployDrawerAtom)
  const overviewApp = overview?.instance
  const deployments = overview?.deployments?.filter(row => row.environment?.id && row.status?.toLowerCase() !== 'undeployed') ?? []
  const releaseRows = releaseHistory?.data?.filter(row => row.id) ?? []
  const canCreateRelease = overviewApp?.canCreateRelease ?? true

  if (!overviewApp?.id)
    return null

  const appId = overviewApp.id
  const appName = overviewApp.name ?? appId
  const appModeLabel = getAppModeLabel(overviewApp.mode ?? 'workflow', tCommon)
  const webappAccessUrl = webappUrl(overview?.access?.webappUrl)
  const cliUrl = overview?.access?.cliUrl
  const apiUrl = overview?.access?.apiUrl ?? accessConfig?.developerApi?.apiUrl
  const apiKeysCount = overview?.access?.apiKeyCount ?? accessConfig?.developerApi?.apiKeys?.length ?? 0

  return (
    <div className="flex w-full max-w-[960px] flex-col gap-5 p-6">
      <Section title={t('overview.basicInfo')}>
        <div className="flex flex-col divide-y divide-divider-subtle">
          <InfoRow label={t('overview.name')} value={appName} />
          <InfoRow label={t('overview.description')} value={overviewApp.description ?? t('overview.emptyValue')} />
          <InfoRow label={t('overview.sourceApp')} value={overviewApp.sourceAppName ?? appName} />
          <InfoRow label={t('overview.appMode')} value={appModeLabel} />
        </div>
      </Section>

      <Section
        title={t('overview.deploymentStatus')}
        action={(
          <Button nativeButton={false} size="small" variant="secondary" render={<Link href={`/deployments/${appId}/deploy`} />}>
            {t('overview.viewDeployments')}
            <span className="i-ri-arrow-right-up-line h-3.5 w-3.5" />
          </Button>
        )}
      >
        {deployments.length === 0
          ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-components-panel-border bg-components-panel-bg-blur px-4 py-8 text-center">
                <span className="i-ri-rocket-line h-5 w-5 text-text-quaternary" />
                <div className="system-sm-regular text-text-tertiary">
                  {releaseRows.length === 0
                    ? t(canCreateRelease ? 'overview.noReleaseYet' : 'overview.noReleaseSourceUnavailable')
                    : t('overview.notDeployedYet')}
                </div>
                {releaseRows.length === 0
                  ? canCreateRelease
                    ? (
                        <Button nativeButton={false} size="small" variant="primary" render={<Link href={`/deployments/${appId}/versions`} />}>
                          {t('overview.createRelease')}
                        </Button>
                      )
                    : (
                        <Button size="small" variant="primary" disabled>
                          {t('overview.createRelease')}
                        </Button>
                      )
                  : (
                      <Button size="small" variant="primary" onClick={() => openDeployDrawer({ appInstanceId: appId })}>
                        {t('overview.deploy')}
                      </Button>
                    )}
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
          <Button nativeButton={false} size="small" variant="secondary" render={<Link href={`/deployments/${appId}/access`} />}>
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
              ? apiUrl || t('overview.notConfigured')
              : t('overview.notConfigured')}
            meta={overview?.access?.developerApiEnabled
              ? t('overview.apiKeysCount', { count: apiKeysCount })
              : undefined}
          />
        </div>
      </Section>
    </div>
  )
}
