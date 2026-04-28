'use client'
import type { FC } from 'react'
import type { DeployedToSummary, ReleaseHistoryRow } from '@/contract/console/deployments'
import { cn } from '@langgenius/dify-ui/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@langgenius/dify-ui/tooltip'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  activeRelease,
  deployedRows,
  deploymentId,
  deploymentStatus,
  environmentId,
  environmentName,
  formatDate,
  releaseCommit,
  releaseLabel,
  targetRelease,
} from '../api-utils'
import { useDeploymentsStore } from '../store'

const GRID_TEMPLATE = 'grid-cols-[0.9fr_1fr_0.8fr_1.5fr_auto]'

type ReleaseDeploymentState = 'active' | 'deploying' | 'failed'

type ReleaseDeployment = {
  environmentId: string
  environmentName: string
  state: ReleaseDeploymentState
}

const RELEASE_DEPLOYMENT_STYLES: Record<ReleaseDeploymentState, string> = {
  active: 'border-util-colors-green-green-200 bg-util-colors-green-green-50 text-util-colors-green-green-700',
  deploying: 'border-util-colors-blue-blue-200 bg-util-colors-blue-blue-50 text-util-colors-blue-blue-700',
  failed: 'border-util-colors-warning-warning-200 bg-util-colors-warning-warning-50 text-util-colors-warning-warning-700',
}

function releaseDeploymentState(status?: string): ReleaseDeploymentState {
  const normalized = status?.toLowerCase() ?? ''
  if (normalized.includes('deploying') || normalized.includes('pending'))
    return 'deploying'
  if (normalized.includes('fail') || normalized.includes('error'))
    return 'failed'
  return 'active'
}

function fromDeployedTo(item: DeployedToSummary): ReleaseDeployment | undefined {
  if (!item.environmentId)
    return undefined

  return {
    environmentId: item.environmentId,
    environmentName: item.environmentName || item.environmentId,
    state: releaseDeploymentState(item.instanceStatus),
  }
}

function dedupeReleaseDeployments(items: ReleaseDeployment[]) {
  return items.filter((item, index) => {
    const key = `${item.environmentId}-${item.state}`
    return items.findIndex(candidate => `${candidate.environmentId}-${candidate.state}` === key) === index
  })
}

type DeployReleaseMenuProps = {
  appId: string
  releaseId: string
}

const DeployReleaseMenu: FC<DeployReleaseMenuProps> = ({ appId, releaseId }) => {
  const { t } = useTranslation('deployments')
  const appData = useDeploymentsStore(state => state.appData[appId])
  const openDeployDrawer = useDeploymentsStore(state => state.openDeployDrawer)
  const openRollbackModal = useDeploymentsStore(state => state.openRollbackModal)
  const [open, setOpen] = useState(false)

  const environments = appData?.candidates.environmentOptions?.filter(env => env.id) ?? []
  const deploymentRows = deployedRows(appData?.environmentDeployments.environmentDeployments)

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex h-7 items-center gap-1 rounded-md px-2 system-xs-medium',
          'border border-components-button-secondary-border bg-components-button-secondary-bg text-components-button-secondary-accent-text',
          'hover:bg-components-button-secondary-bg-hover',
        )}
      >
        {t('versions.deploy')}
        <span className="i-ri-arrow-down-s-line h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      {open && (
        <DropdownMenuContent placement="bottom-end" sideOffset={4} popupClassName="w-[220px]">
          {environments.map((env) => {
            const envId = env.id!
            const row = deploymentRows.find(item => environmentId(item.environment) === envId)
            const isCurrent = activeRelease(row)?.id === releaseId
            const isEnvironmentDeploying = row ? deploymentStatus(row) === 'deploying' : false
            const disabled = Boolean(env.disabled || isCurrent || isEnvironmentDeploying)
            return (
              <DropdownMenuItem
                key={envId}
                className="gap-2 px-3"
                disabled={disabled}
                onClick={() => {
                  setOpen(false)
                  if (disabled)
                    return
                  if (row) {
                    openRollbackModal({
                      appId,
                      environmentId: envId,
                      deploymentId: deploymentId(row),
                      targetReleaseId: releaseId,
                    })
                    return
                  }
                  openDeployDrawer({ appId, environmentId: envId, releaseId })
                }}
              >
                <span className="system-sm-regular text-text-secondary">
                  {isEnvironmentDeploying
                    ? t('versions.deployingTo', { name: environmentName(env) })
                    : isCurrent
                      ? t('versions.currentOn', { name: environmentName(env) })
                      : row
                        ? t('versions.promoteTo', { name: environmentName(env) })
                        : t('versions.deployTo', { name: environmentName(env) })}
                </span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}

const DeployedToBadge: FC<{ item: ReleaseDeployment }> = ({ item }) => {
  const { t } = useTranslation('deployments')
  const statusLabel = t(`versions.deployedStatus.${item.state}`)

  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <span
            className={cn(
              'inline-flex h-6 items-center gap-1 rounded-md border px-1.5 system-xs-medium',
              RELEASE_DEPLOYMENT_STYLES[item.state],
            )}
          >
            {item.state === 'deploying'
              ? <span className="i-ri-loader-4-line h-3.5 w-3.5 animate-spin" />
              : item.state === 'failed'
                ? <span className="i-ri-alert-line h-3.5 w-3.5" />
                : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            {item.environmentName}
          </span>
        )}
      />
      <TooltipContent>
        {statusLabel}
        {' · '}
        {item.environmentName}
      </TooltipContent>
    </Tooltip>
  )
}

type VersionsTabProps = {
  instanceId: string
}

const VersionsTab: FC<VersionsTabProps> = ({ instanceId: appId }) => {
  const { t } = useTranslation('deployments')
  const appData = useDeploymentsStore(state => state.appData[appId])
  const releaseRows = useMemo(
    () => appData?.releaseHistory.data?.filter(row => row.release?.id) ?? [],
    [appData?.releaseHistory.data],
  )
  const deploymentRows = useMemo(
    () => deployedRows(appData?.environmentDeployments.environmentDeployments),
    [appData?.environmentDeployments.environmentDeployments],
  )

  const getReleaseDeployments = (row: ReleaseHistoryRow) => {
    const releaseId = row.release?.id
    if (!releaseId)
      return []

    const historyItems = row.deployedTo?.map(fromDeployedTo).filter((item): item is ReleaseDeployment => !!item) ?? []
    const runtimeItems = deploymentRows.flatMap((deployment) => {
      const envId = environmentId(deployment.environment)
      if (!envId)
        return []

      const items: ReleaseDeployment[] = []
      if (activeRelease(deployment)?.id === releaseId) {
        items.push({
          environmentId: envId,
          environmentName: environmentName(deployment.environment),
          state: 'active',
        })
      }
      if (targetRelease(deployment)?.id === releaseId) {
        items.push({
          environmentId: envId,
          environmentName: environmentName(deployment.environment),
          state: 'deploying',
        })
      }
      if (deployment.instance?.lastError?.releaseId === releaseId) {
        items.push({
          environmentId: envId,
          environmentName: environmentName(deployment.environment),
          state: 'failed',
        })
      }
      return items
    })

    return dedupeReleaseDeployments([...historyItems, ...runtimeItems])
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="system-sm-semibold text-text-primary">
          {t('versions.releaseHistory')}
          {' '}
          <span className="system-sm-regular text-text-tertiary">
            (
            {releaseRows.length}
            )
          </span>
        </div>
      </div>

      {releaseRows.length === 0
        ? (
            <div className="rounded-xl border border-dashed border-components-panel-border bg-components-panel-bg-blur px-4 py-12 text-center system-sm-regular text-text-tertiary">
              {t('versions.empty')}
            </div>
          )
        : (
            <div className="overflow-hidden rounded-xl border border-components-panel-border bg-components-panel-bg">
              <div className={cn(
                'hidden items-center gap-4 border-b border-divider-subtle px-4 py-3 system-xs-medium-uppercase text-text-tertiary lg:grid',
                GRID_TEMPLATE,
              )}
              >
                <div>{t('versions.col.release')}</div>
                <div>{t('versions.col.createdAt')}</div>
                <div>{t('versions.col.author')}</div>
                <div>{t('versions.col.deployedTo')}</div>
                <div className="text-right">{t('versions.col.action')}</div>
              </div>

              {releaseRows.map((row) => {
                const release = row.release!
                const releaseDeployments = getReleaseDeployments(row)
                return (
                  <div key={release.id} className="border-b border-divider-subtle last:border-b-0">
                    <div className="flex flex-col gap-3 px-4 py-3 lg:hidden">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="system-xs-medium-uppercase text-text-tertiary">
                            {t('versions.col.release')}
                          </div>
                          <Tooltip>
                            <TooltipTrigger
                              render={(
                                <span className="mt-1 inline-flex max-w-full cursor-default truncate font-mono system-sm-medium text-text-primary">
                                  {releaseLabel(release)}
                                </span>
                              )}
                            />
                            <TooltipContent>
                              {t('versions.commitTooltip', { commit: releaseCommit(release) })}
                            </TooltipContent>
                          </Tooltip>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 system-xs-regular text-text-tertiary">
                            <span>{formatDate(release.createdAt)}</span>
                            <span aria-hidden>·</span>
                            <span>{row.createdBy?.displayName ?? '—'}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 justify-end gap-1">
                          <DeployReleaseMenu releaseId={release.id!} appId={appId} />
                        </div>
                      </div>
                      <div>
                        <div className="system-xs-medium-uppercase text-text-tertiary">
                          {t('versions.col.deployedTo')}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {releaseDeployments.length === 0
                            ? <span className="system-sm-regular text-text-quaternary">—</span>
                            : releaseDeployments.map(item => (
                                <DeployedToBadge
                                  key={`${item.environmentId}-${item.state}`}
                                  item={item}
                                />
                              ))}
                        </div>
                      </div>
                    </div>
                    <div className={cn(
                      'hidden items-center gap-4 px-4 py-3 lg:grid',
                      GRID_TEMPLATE,
                    )}
                    >
                      <div>
                        <Tooltip>
                          <TooltipTrigger
                            render={(
                              <span className="inline-flex cursor-default font-mono system-sm-medium text-text-primary">
                                {releaseLabel(release)}
                              </span>
                            )}
                          />
                          <TooltipContent>
                            {t('versions.commitTooltip', { commit: releaseCommit(release) })}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="system-sm-regular text-text-secondary">{formatDate(release.createdAt)}</div>
                      <div className="system-sm-regular text-text-secondary">{row.createdBy?.displayName ?? '—'}</div>
                      <div className="flex flex-wrap gap-1">
                        {releaseDeployments.length === 0
                          ? <span className="system-sm-regular text-text-quaternary">—</span>
                          : releaseDeployments.map(item => (
                              <DeployedToBadge
                                key={`${item.environmentId}-${item.state}`}
                                item={item}
                              />
                            ))}
                      </div>
                      <div className="flex justify-end gap-1">
                        <DeployReleaseMenu releaseId={release.id!} appId={appId} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
    </div>
  )
}

export default VersionsTab
