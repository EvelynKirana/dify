'use client'
import type { FC, KeyboardEvent } from 'react'
import { Button } from '@langgenius/dify-ui/button'
import { cn } from '@langgenius/dify-ui/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { consoleQuery } from '@/service/client'
import { useUndeployDeployment } from '../hooks/use-deployment-mutations'
import { useDeploymentsStore } from '../store'
import {
  activeRelease,
  deployedRows,
  deploymentId,
  deploymentStatus,
  environmentBackend,
  environmentId,
  environmentMode,
  environmentName,
  environmentOptionsFromOptionsReply,
  isUndeployedDeploymentRow,
  releaseCommit,
  releaseLabel,
} from '../utils'
import { DeploymentPanel } from './deploy-tab/deployment-panel'
import { DeploymentStatusSummary } from './deploy-tab/deployment-status-summary'

const GRID_TEMPLATE = 'lg:grid-cols-[minmax(180px,1fr)_minmax(140px,0.75fr)_minmax(180px,0.85fr)_240px]'

type DeployTabProps = {
  instanceId: string
}

const DeployTab: FC<DeployTabProps> = ({ instanceId: appInstanceId }) => {
  const { t } = useTranslation('deployments')
  const { data: environmentDeployments } = useQuery(consoleQuery.enterprise.appDeploy.listRuntimeInstances.queryOptions({
    input: {
      params: { appInstanceId },
    },
  }))
  const { data: environmentOptionsReply } = useQuery(consoleQuery.enterprise.appDeploy.listDeploymentEnvironmentOptions.queryOptions())
  const openDeployDrawer = useDeploymentsStore(state => state.openDeployDrawer)
  const undeployDeployment = useUndeployDeployment()
  const environmentOptions = useMemo(
    () => environmentOptionsFromOptionsReply(environmentOptionsReply),
    [environmentOptionsReply],
  )

  const rows = useMemo(
    () => environmentDeployments?.data?.filter(row => row.environment?.id) ?? [],
    [environmentDeployments?.data],
  )
  const deployedRuntimeRows = useMemo(
    () => deployedRows(environmentDeployments?.data),
    [environmentDeployments?.data],
  )

  const deployedEnvIds = new Set(deployedRuntimeRows.map(row => environmentId(row.environment)))
  const availableEnvs = environmentOptions.filter(env => env.id && !deployedEnvIds.has(env.id))
  const expandableEnvIds = useMemo(
    () => rows.filter(row => !isUndeployedDeploymentRow(row)).map(row => environmentId(row.environment)),
    [rows],
  )
  const [expanded, setExpanded] = useState<string | null>()
  const activeExpanded = expanded === undefined
    ? expandableEnvIds[0] ?? null
    : expanded !== null && expandableEnvIds.includes(expanded)
      ? expanded
      : null
  const toggle = (id: string) => {
    setExpanded((prev) => {
      const current = prev === undefined ? expandableEnvIds[0] ?? null : prev
      return current === id ? null : id
    })
  }
  const [deployMenuOpen, setDeployMenuOpen] = useState(false)

  return (
    <div className="flex w-full max-w-[960px] flex-col gap-4 p-6">
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
                  openDeployDrawer({ appInstanceId })
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
                      disabled={env.disabled}
                      onClick={() => {
                        if (env.disabled)
                          return
                        setDeployMenuOpen(false)
                        openDeployDrawer({ appInstanceId, environmentId: env.id })
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
                <div className="text-right">{t('deployTab.col.actions')}</div>
              </div>
              {rows.map((row) => {
                const envId = environmentId(row.environment)
                const isUndeployed = isUndeployedDeploymentRow(row)
                const isExpanded = !isUndeployed && activeExpanded === envId
                const status = deploymentStatus(row)
                const release = activeRelease(row)
                const actions = (
                  <div
                    className="flex shrink-0 items-center gap-1"
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                  >
                    <Button size="small" variant="secondary" onClick={() => openDeployDrawer({ appInstanceId, environmentId: envId })}>
                      {isUndeployed
                        ? t('deployDrawer.deploy')
                        : status === 'ready'
                          ? t('deployTab.deployOtherVersion')
                          : status === 'deploying'
                            ? t('deployTab.viewProgress')
                            : t('deployTab.viewError')}
                    </Button>
                    {!isUndeployed && (
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
                            onClick={() => undeployDeployment.mutate({
                              appInstanceId,
                              runtimeInstanceId: deploymentId(row),
                              isDeploying: status === 'deploying',
                            })}
                          >
                            <span className="system-sm-regular text-text-destructive">
                              {status === 'deploying' ? t('deployTab.cancelDeployment') : t('deployTab.undeploy')}
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )
                const chevron = !isUndeployed && (
                  <span
                    className={cn(
                      'i-ri-arrow-down-s-line h-4 w-4 shrink-0 text-text-tertiary transition-transform',
                      isExpanded && 'rotate-180',
                    )}
                  />
                )
                const handleRowToggle = () => {
                  if (!isUndeployed)
                    toggle(envId)
                }
                const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
                  if (isUndeployed)
                    return

                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggle(envId)
                  }
                }
                return (
                  <div key={envId} className="border-b border-divider-subtle last:border-b-0">
                    <div
                      role={isUndeployed ? undefined : 'button'}
                      tabIndex={isUndeployed ? undefined : 0}
                      onClick={handleRowToggle}
                      onKeyDown={handleRowKeyDown}
                      className={cn(
                        'flex w-full flex-col gap-2 px-4 py-3 text-left',
                        !isUndeployed && 'cursor-pointer hover:bg-state-base-hover',
                        'lg:grid lg:items-center lg:gap-4',
                        GRID_TEMPLATE,
                      )}
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3 lg:block">
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
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 truncate font-mono system-sm-medium text-text-primary">{isUndeployed ? '—' : releaseLabel(release)}</span>
                        {!isUndeployed && (
                          <span className="shrink-0 font-mono system-xs-regular text-text-tertiary">{releaseCommit(release)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <DeploymentStatusSummary row={row} />
                      </div>
                      <div className="hidden min-w-0 items-center justify-end gap-1 lg:flex">
                        {actions}
                        {chevron}
                      </div>
                    </div>
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
