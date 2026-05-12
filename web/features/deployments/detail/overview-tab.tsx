'use client'
import type { ReactNode } from 'react'
import { Button } from '@langgenius/dify-ui/button'
import { cn } from '@langgenius/dify-ui/cn'
import { useQuery } from '@tanstack/react-query'
import { useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { getAppModeLabel } from '@/app/components/app-sidebar/app-info/app-mode-labels'
import { SkeletonRectangle } from '@/app/components/base/skeleton'
import Link from '@/next/link'
import { consoleQuery } from '@/service/client'
import { toAppMode } from '../app-mode'
import { StatusBadge } from '../components/status-badge'
import { DEPLOYMENT_PAGE_SIZE } from '../data'
import { releaseLabel } from '../release'
import { deploymentStatus } from '../runtime-status'
import { openDeployDrawerAtom } from '../store'
import { webappUrl } from '../webapp-url'
import { Section, SectionState } from './common'

const STATUS_ROW_SKELETON_KEYS = ['primary', 'secondary']

function InfoRowsSkeleton({ rows }: {
  rows: Array<{
    key: string
    label: string
    valueClassName: string
  }>
}) {
  return (
    <div className="flex flex-col divide-y divide-divider-subtle">
      {rows.map(row => (
        <div key={row.key} className="flex items-start gap-3 py-1.5">
          <span className="w-32 shrink-0 system-xs-regular text-text-tertiary">{row.label}</span>
          <div className="min-w-0 flex-1 py-1">
            <SkeletonRectangle className={cn('my-0 h-3 animate-pulse', row.valueClassName)} />
          </div>
        </div>
      ))}
    </div>
  )
}

function StatusRowsSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-divider-subtle">
      {STATUS_ROW_SKELETON_KEYS.map(key => (
        <div key={key} className="flex items-center justify-between gap-3 py-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <SkeletonRectangle className="my-0 h-3 w-32 animate-pulse" />
            <SkeletonRectangle className="my-0 h-2.5 w-24 animate-pulse" />
          </div>
          <SkeletonRectangle className="my-0 h-5 w-20 animate-pulse rounded-md" />
        </div>
      ))}
    </div>
  )
}

function AccessRowsSkeleton({ rows }: {
  rows: Array<{
    key: string
    label: string
    hintClassName: string
    showMeta?: boolean
  }>
}) {
  return (
    <div className="flex flex-col divide-y divide-divider-subtle">
      {rows.map(row => (
        <div key={row.key} className="flex items-center justify-between gap-3 py-1.5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="system-sm-medium text-text-primary">{row.label}</span>
            <SkeletonRectangle className={cn('my-0 h-2.5 animate-pulse', row.hintClassName)} />
            {row.showMeta && <SkeletonRectangle className="my-0 h-2.5 w-14 animate-pulse" />}
          </div>
          <SkeletonRectangle className="my-0 h-4 w-16 animate-pulse" />
        </div>
      ))}
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

function AccessOverviewRow({ label, enabled, hint, meta }: {
  label: string
  enabled: boolean
  hint?: string
  meta?: string
}) {
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
          'size-1.5 rounded-full',
          enabled ? 'bg-util-colors-green-green-500' : 'bg-text-quaternary',
        )}
        />
        {enabled ? t('overview.enabled') : t('overview.disabled')}
      </span>
    </div>
  )
}

function DeployFromOverviewButton({ appInstanceId }: {
  appInstanceId: string
}) {
  const { t } = useTranslation('deployments')
  const openDeployDrawer = useSetAtom(openDeployDrawerAtom)

  return (
    <Button size="small" variant="primary" onClick={() => openDeployDrawer({ appInstanceId })}>
      {t('overview.deploy')}
    </Button>
  )
}

function BasicInfoSection({ appInstanceId }: {
  appInstanceId: string
}) {
  const { t } = useTranslation('deployments')
  const { t: tCommon } = useTranslation()
  const overviewQuery = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceOverview.queryOptions({
    input: {
      params: { appInstanceId },
    },
  }))
  const overview = overviewQuery.data
  const overviewApp = overview?.instance
  const skeletonRows = [
    { key: 'name', label: t('overview.name'), valueClassName: 'w-30' },
    { key: 'description', label: t('overview.description'), valueClassName: 'w-18' },
    { key: 'source-app', label: t('overview.sourceApp'), valueClassName: 'w-30' },
    { key: 'app-mode', label: t('overview.appMode'), valueClassName: 'w-18' },
  ]

  if (overviewQuery.isLoading) {
    return (
      <Section title={t('overview.basicInfo')}>
        <InfoRowsSkeleton rows={skeletonRows} />
      </Section>
    )
  }

  if (overviewQuery.isError) {
    return (
      <Section title={t('overview.basicInfo')}>
        <SectionState>{t('common.loadFailed')}</SectionState>
      </Section>
    )
  }

  if (!overviewApp?.id) {
    return (
      <Section title={t('overview.basicInfo')}>
        <SectionState>{t('detail.notFound')}</SectionState>
      </Section>
    )
  }

  const appName = overviewApp.name ?? overviewApp.id
  const appModeLabel = getAppModeLabel(toAppMode(overviewApp.mode), tCommon)

  return (
    <Section title={t('overview.basicInfo')}>
      <div className="flex flex-col divide-y divide-divider-subtle">
        <InfoRow label={t('overview.name')} value={appName} />
        <InfoRow label={t('overview.description')} value={overviewApp.description ?? t('overview.emptyValue')} />
        <InfoRow label={t('overview.sourceApp')} value={overviewApp.sourceAppName ?? appName} />
        <InfoRow label={t('overview.appMode')} value={appModeLabel} />
      </div>
    </Section>
  )
}

function DeploymentStatusSection({ appInstanceId }: {
  appInstanceId: string
}) {
  const { t } = useTranslation('deployments')
  const input = { params: { appInstanceId } }
  const overviewQuery = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceOverview.queryOptions({
    input,
  }))
  const releaseHistoryQuery = useQuery(consoleQuery.enterprise.appDeploy.listReleases.queryOptions({
    input: {
      ...input,
      query: {
        pageNumber: 1,
        resultsPerPage: DEPLOYMENT_PAGE_SIZE,
      },
    },
  }))
  const overview = overviewQuery.data
  const releaseHistory = releaseHistoryQuery.data
  const overviewApp = overview?.instance
  const deployments = overview?.deployments?.filter(row => row.environment?.id && row.status?.toLowerCase() !== 'undeployed') ?? []
  const releaseRows = releaseHistory?.data?.filter(row => row.id) ?? []
  const canCreateRelease = overviewApp?.canCreateRelease ?? true
  const action = (
    <Button nativeButton={false} size="small" variant="secondary" render={<Link href={`/deployments/${appInstanceId}/deploy`} />}>
      {t('overview.viewDeployments')}
      <span className="i-ri-arrow-right-up-line size-3.5" />
    </Button>
  )

  if (overviewQuery.isLoading || releaseHistoryQuery.isLoading) {
    return (
      <Section title={t('overview.deploymentStatus')} action={action}>
        <StatusRowsSkeleton />
      </Section>
    )
  }

  if (overviewQuery.isError || releaseHistoryQuery.isError) {
    return (
      <Section title={t('overview.deploymentStatus')} action={action}>
        <SectionState>{t('common.loadFailed')}</SectionState>
      </Section>
    )
  }

  if (!overviewApp?.id) {
    return (
      <Section title={t('overview.deploymentStatus')} action={action}>
        <SectionState>{t('detail.notFound')}</SectionState>
      </Section>
    )
  }

  return (
    <Section
      title={t('overview.deploymentStatus')}
      action={action}
    >
      {deployments.length === 0
        ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-components-panel-border bg-components-panel-bg-blur px-4 py-8 text-center">
              <span className="i-ri-rocket-line size-5 text-text-quaternary" />
              <div className="system-sm-regular text-text-tertiary">
                {releaseRows.length === 0
                  ? t(canCreateRelease ? 'overview.noReleaseYet' : 'overview.noReleaseSourceUnavailable')
                  : t('overview.notDeployedYet')}
              </div>
              {releaseRows.length === 0
                ? canCreateRelease
                  ? (
                      <Button nativeButton={false} size="small" variant="primary" render={<Link href={`/deployments/${appInstanceId}/versions`} />}>
                        {t('overview.createRelease')}
                      </Button>
                    )
                  : (
                      <Button size="small" variant="primary" disabled>
                        {t('overview.createRelease')}
                      </Button>
                    )
                : (
                    <DeployFromOverviewButton appInstanceId={appInstanceId} />
                  )}
            </div>
          )
        : (
            <div className="flex flex-col divide-y divide-divider-subtle">
              {deployments.map((row) => {
                const status = deploymentStatus(row)
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
  )
}

function AccessStatusSection({ appInstanceId }: {
  appInstanceId: string
}) {
  const { t } = useTranslation('deployments')
  const input = { params: { appInstanceId } }
  const overviewQuery = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceOverview.queryOptions({
    input,
  }))
  const accessConfigQuery = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceAccess.queryOptions({
    input,
  }))
  const overview = overviewQuery.data
  const accessConfig = accessConfigQuery.data
  const webappAccessUrl = webappUrl(overview?.access?.webappUrl)
  const cliUrl = overview?.access?.cliUrl
  const apiUrl = overview?.access?.apiUrl ?? accessConfig?.developerApi?.apiUrl
  const apiKeysCount = overview?.access?.apiKeyCount ?? accessConfig?.developerApi?.apiKeys?.length ?? 0
  const skeletonRows = [
    { key: 'webapp', label: t('overview.webapp'), hintClassName: 'w-28' },
    { key: 'cli', label: t('overview.cli'), hintClassName: 'w-44' },
    { key: 'api', label: t('overview.api'), hintClassName: 'w-64', showMeta: true },
  ]
  const action = (
    <Button nativeButton={false} size="small" variant="secondary" render={<Link href={`/deployments/${appInstanceId}/settings`} />}>
      {t('overview.configureAccess')}
      <span className="i-ri-arrow-right-up-line size-3.5" />
    </Button>
  )

  if (overviewQuery.isLoading || accessConfigQuery.isLoading) {
    return (
      <Section title={t('overview.accessStatus')} action={action}>
        <AccessRowsSkeleton rows={skeletonRows} />
      </Section>
    )
  }

  if (overviewQuery.isError || accessConfigQuery.isError) {
    return (
      <Section title={t('overview.accessStatus')} action={action}>
        <SectionState>{t('common.loadFailed')}</SectionState>
      </Section>
    )
  }

  if (!overview?.instance?.id) {
    return (
      <Section title={t('overview.accessStatus')} action={action}>
        <SectionState>{t('detail.notFound')}</SectionState>
      </Section>
    )
  }

  return (
    <Section
      title={t('overview.accessStatus')}
      action={action}
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
  )
}

export function OverviewTab({ appInstanceId }: {
  appInstanceId: string
}) {
  return (
    <div className="flex w-full max-w-240 flex-col gap-5 p-6">
      <BasicInfoSection appInstanceId={appInstanceId} />
      <DeploymentStatusSection appInstanceId={appInstanceId} />
      <AccessStatusSection appInstanceId={appInstanceId} />
    </div>
  )
}
