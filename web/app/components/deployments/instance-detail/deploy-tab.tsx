'use client'
import type { FC } from 'react'
import type { EnvironmentDeploymentRow } from '@/contract/console/deployments'
import { Button } from '@langgenius/dify-ui/button'
import { cn } from '@langgenius/dify-ui/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import * as React from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  activeRelease,
  deployedRows,
  deploymentId,
  deploymentStatus,
  environmentBackend,
  environmentHealth,
  environmentId,
  environmentMode,
  environmentName,
  formatDate,
  releaseCommit,
  releaseLabel,
  targetRelease,
} from '../api-utils'
import { HealthBadge, ModeBadge } from '../status-badge'
import { useDeploymentsStore } from '../store'

const GRID_TEMPLATE = 'lg:grid-cols-[1.2fr_0.8fr_1fr_auto]'

type InfoBlockProps = {
  title: string
  children: React.ReactNode
}

const InfoBlock: FC<InfoBlockProps> = ({ title, children }) => (
  <div className="flex flex-col gap-1.5">
    <div className="system-xs-medium-uppercase text-text-tertiary">{title}</div>
    <div className="flex flex-col gap-1">{children}</div>
  </div>
)

type InfoRowProps = {
  label: string
  value: React.ReactNode
  mono?: boolean
  suffix?: string
}

const InfoRow: FC<InfoRowProps> = ({ label, value, mono, suffix }) => (
  <div className="flex items-start gap-2 py-0.5">
    <span className="w-24 shrink-0 system-xs-regular text-text-tertiary">{label}</span>
    <span className={cn('min-w-0 flex-1 system-sm-regular break-words text-text-primary', mono && 'font-mono')}>
      {value}
      {suffix && <span className="system-xs-regular text-text-tertiary">{suffix}</span>}
    </span>
  </div>
)

type DeploymentPanelProps = {
  row: EnvironmentDeploymentRow
}

const DeploymentPanel: FC<DeploymentPanelProps> = ({ row }) => {
  const { t } = useTranslation('deployments')
  const observed = activeRelease(row)
  const pending = targetRelease(row)
  const env = row.environment
  const observedBindings = row.observedRuntime?.bindings
  const pendingBindings = row.pendingDeployment?.bindings
  const credentials = [...observedBindings?.credentials ?? [], ...pendingBindings?.credentials ?? []]
  const envVars = [...observedBindings?.envVars ?? [], ...pendingBindings?.envVars ?? []]

  return (
    <div className="border-t border-divider-subtle bg-background-default-subtle px-6 py-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="system-sm-semibold text-text-primary">
          {environmentName(env)}
          {' · '}
          {releaseLabel(observed || pending)}
        </span>
        <ModeBadge mode={environmentMode(env)} />
        <HealthBadge health={environmentHealth(env)} />
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        <InfoBlock title={t('deployTab.panel.instanceInfo')}>
          <InfoRow label={t('deployTab.panel.deploymentId')} value={deploymentId(row) || '—'} mono />
          <InfoRow label={t('deployTab.panel.replicas')} value={row.instance?.replicas != null ? String(row.instance.replicas) : '—'} />
          <InfoRow label={t('deployTab.panel.runtimeMode')} value={t(environmentMode(env) === 'isolated' ? 'mode.isolated' : 'mode.shared')} suffix={` / ${environmentBackend(env).toUpperCase()}`} />
          <InfoRow label={t('deployTab.panel.runtimeNote')} value={row.instance?.status ?? '—'} />
        </InfoBlock>

        <InfoBlock title={t('deployTab.panel.releaseInfo')}>
          <InfoRow label={t('deployTab.panel.release')} value={releaseLabel(observed || pending)} mono />
          <InfoRow label={t('deployTab.panel.commit')} value={releaseCommit(observed || pending)} mono />
          <InfoRow label={t('deployTab.panel.createdAt')} value={formatDate((observed || pending)?.createdAt)} />
          {pending && (
            <InfoRow label={t('deployTab.panel.targetRelease')} value={`${releaseLabel(pending)} / ${releaseCommit(pending)}`} mono />
          )}
          {row.instance?.lastError?.releaseId && (
            <InfoRow label={t('deployTab.panel.failedRelease')} value={row.instance.lastError.releaseId} mono />
          )}
        </InfoBlock>

        <InfoBlock title={t('deployTab.panel.endpoints')}>
          <InfoRow label={t('deployTab.panel.run')} value={row.observedRuntime?.endpoints?.run ?? '—'} mono />
          <InfoRow label={t('deployTab.panel.health')} value={row.observedRuntime?.endpoints?.health ?? '—'} mono />
        </InfoBlock>

        {credentials.length > 0 && (
          <InfoBlock title={t('deployTab.panel.modelCreds')}>
            {credentials.map(c => (
              <InfoRow
                key={`${c.slot}-${c.displayName}-${c.maskedValue}`}
                label={c.slot ?? '—'}
                value={c.displayName || c.maskedValue || '—'}
                mono
              />
            ))}
          </InfoBlock>
        )}

        {envVars.length > 0 && (
          <InfoBlock title={t('deployTab.panel.envVars')}>
            {envVars.map(v => (
              <InfoRow
                key={`${v.slot}-${v.displayName}`}
                label={v.slot ?? '—'}
                value={v.maskedValue || v.displayName || '—'}
                mono
              />
            ))}
          </InfoBlock>
        )}
      </div>

      {row.instance?.lastError?.message && (
        <div className="mt-4 rounded-lg border border-util-colors-red-red-200 bg-util-colors-red-red-50 px-3 py-2 system-xs-regular text-util-colors-red-red-700">
          {row.instance.lastError.message}
        </div>
      )}
    </div>
  )
}

type DeploymentStatusSummaryProps = {
  row: EnvironmentDeploymentRow
}

const DeploymentStatusSummary: FC<DeploymentStatusSummaryProps> = ({ row }) => {
  const { t } = useTranslation('deployments')
  const status = deploymentStatus(row)

  if (status === 'deploying') {
    return (
      <span className="inline-flex items-center gap-1.5 system-sm-medium text-util-colors-blue-blue-700">
        <span className="i-ri-loader-4-line h-3.5 w-3.5 animate-spin" />
        {t('deployTab.status.deployingRelease', { release: releaseLabel(targetRelease(row) || activeRelease(row)) })}
      </span>
    )
  }

  if (status === 'deploy_failed') {
    return (
      <span className="inline-flex items-center gap-1.5 system-sm-medium text-util-colors-warning-warning-700">
        <span className="i-ri-alert-line h-3.5 w-3.5" />
        {t('deployTab.status.runningWithFailed')}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 system-sm-medium text-util-colors-green-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-util-colors-green-green-500" />
      {t('status.ready')}
    </span>
  )
}

type DeployTabProps = {
  instanceId: string
}

const DeployTab: FC<DeployTabProps> = ({ instanceId: appId }) => {
  const { t } = useTranslation('deployments')
  const appData = useDeploymentsStore(state => state.appData[appId])
  const openDeployDrawer = useDeploymentsStore(state => state.openDeployDrawer)
  const undeployDeployment = useDeploymentsStore(state => state.undeployDeployment)

  const rows = useMemo(
    () => deployedRows(appData?.environmentDeployments.environmentDeployments),
    [appData?.environmentDeployments.environmentDeployments],
  )

  const deployedEnvIds = new Set(rows.map(row => environmentId(row.environment)))
  const availableEnvs = appData?.candidates.environmentOptions?.filter(env => env.id && !deployedEnvIds.has(env.id)) ?? []
  const [expanded, setExpanded] = useState<string | null>(() => rows[0] ? environmentId(rows[0].environment) : null)
  const toggle = (id: string) => setExpanded(prev => (prev === id ? null : id))
  const [deployMenuOpen, setDeployMenuOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="system-sm-semibold text-text-primary">
          {t('deployTab.envCount')}
          {' '}
          <span className="system-sm-regular text-text-tertiary">
            (
            {rows.length}
            )
          </span>
        </div>
        <DropdownMenu modal={false} open={deployMenuOpen} onOpenChange={setDeployMenuOpen}>
          <DropdownMenuTrigger
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-3 system-sm-medium',
              'border border-components-button-primary-border bg-components-button-primary-bg text-components-button-primary-text',
              'hover:bg-components-button-primary-bg-hover',
            )}
          >
            <span className="i-ri-rocket-line h-3.5 w-3.5" />
            {t('deployTab.newDeployment')}
            <span className="i-ri-arrow-down-s-line h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          {deployMenuOpen && (
            <DropdownMenuContent placement="bottom-end" sideOffset={4} popupClassName="w-[220px]">
              <DropdownMenuItem
                className="gap-2 px-3"
                onClick={() => {
                  setDeployMenuOpen(false)
                  openDeployDrawer({ appId })
                }}
              >
                <span className="system-sm-regular text-text-secondary">{t('deployTab.deployToNewEnv')}</span>
              </DropdownMenuItem>
              {availableEnvs.length > 0 && (
                <>
                  <div className="px-3 py-1 system-xs-medium-uppercase text-text-quaternary">{t('deployTab.shortcut')}</div>
                  {availableEnvs.map(env => (
                    <DropdownMenuItem
                      key={env.id}
                      className="gap-2 px-3"
                      onClick={() => {
                        setDeployMenuOpen(false)
                        openDeployDrawer({ appId, environmentId: env.id })
                      }}
                    >
                      <span className="system-sm-regular text-text-secondary">
                        {t('deployTab.deployToEnv', { name: environmentName(env) })}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </div>

      {rows.length === 0
        ? (
            <div className="rounded-xl border border-dashed border-components-panel-border bg-components-panel-bg-blur px-4 py-12 text-center system-sm-regular text-text-tertiary">
              {t('deployTab.empty')}
            </div>
          )
        : (
            <div className="overflow-hidden rounded-xl border border-components-panel-border bg-components-panel-bg">
              <div className={cn(
                'hidden items-center gap-4 border-b border-divider-subtle px-4 py-3 system-xs-medium-uppercase text-text-tertiary lg:grid',
                GRID_TEMPLATE,
              )}
              >
                <div>{t('deployTab.col.environment')}</div>
                <div>{t('deployTab.col.currentRelease')}</div>
                <div>{t('deployTab.col.status')}</div>
                <div />
              </div>
              {rows.map((row) => {
                const envId = environmentId(row.environment)
                const isExpanded = expanded === envId
                const status = deploymentStatus(row)
                const release = activeRelease(row) || targetRelease(row)
                const actions = (
                  <div className="flex shrink-0 items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="small" variant="secondary" onClick={() => openDeployDrawer({ appId, environmentId: envId })}>
                      {status === 'ready' ? t('deployTab.deployOtherVersion') : t('deployTab.viewProgress')}
                    </Button>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger
                        aria-label={t('deployTab.moreActions')}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-state-base-hover hover:text-text-secondary"
                      >
                        <span className="i-ri-more-line h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent placement="bottom-end" sideOffset={4} popupClassName="w-[200px]">
                        <DropdownMenuItem
                          className="gap-2 px-3"
                          onClick={() => undeployDeployment(appId, envId, deploymentId(row), status === 'deploying')}
                        >
                          <span className="system-sm-regular text-text-destructive">
                            {status === 'deploying' ? t('deployTab.cancelDeployment') : t('deployTab.undeploy')}
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
                const chevron = (
                  <span
                    className={cn(
                      'i-ri-arrow-down-s-line h-4 w-4 shrink-0 text-text-tertiary transition-transform',
                      isExpanded && 'rotate-180',
                    )}
                  />
                )
                return (
                  <div key={envId} className="border-b border-divider-subtle last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggle(envId)}
                      className={cn(
                        'flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-state-base-hover',
                        'lg:grid lg:items-center lg:gap-4',
                        GRID_TEMPLATE,
                      )}
                    >
                      <div className="flex items-start justify-between gap-3 lg:block">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate system-sm-semibold text-text-primary">{environmentName(row.environment)}</span>
                          <div className="flex items-center gap-1.5 system-xs-regular text-text-tertiary">
                            <span className="uppercase">{environmentBackend(row.environment)}</span>
                            <span>·</span>
                            <span>{t(environmentMode(row.environment) === 'isolated' ? 'mode.isolated' : 'mode.shared')}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 lg:hidden">
                          {actions}
                          {chevron}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 lg:contents">
                        <div className="flex items-center gap-2">
                          <span className="font-mono system-sm-medium text-text-primary">{releaseLabel(release)}</span>
                          <span className="font-mono system-xs-regular text-text-tertiary">{releaseCommit(release)}</span>
                        </div>
                        <div>
                          <DeploymentStatusSummary row={row} />
                        </div>
                      </div>
                      <div className="hidden items-center justify-end gap-1 lg:flex">
                        {actions}
                        {chevron}
                      </div>
                    </button>
                    {isExpanded && <DeploymentPanel row={row} />}
                  </div>
                )
              })}
            </div>
          )}
    </div>
  )
}

export default DeployTab
