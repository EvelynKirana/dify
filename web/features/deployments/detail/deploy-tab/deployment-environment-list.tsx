'use client'

import type { RuntimeInstanceRow } from '@dify/contracts/enterprise/types.gen'
import type { KeyboardEvent } from 'react'
import { Button } from '@langgenius/dify-ui/button'
import { cn } from '@langgenius/dify-ui/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { useMutation } from '@tanstack/react-query'
import { useSetAtom } from 'jotai'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { consoleQuery } from '@/service/client'
import {
  environmentBackend,
  environmentId,
  environmentMode,
  environmentName,
} from '../../environment'
import { releaseCommit, releaseLabel } from '../../release'
import { deploymentStatus, isUndeployedDeploymentRow } from '../../runtime-status'
import { openDeployDrawerAtom } from '../../store'
import { DeploymentPanel } from './deployment-panel'
import { DeploymentStatusSummary } from './deployment-status-summary'

const GRID_TEMPLATE = 'lg:grid-cols-[minmax(180px,1fr)_minmax(140px,0.75fr)_minmax(180px,0.85fr)_240px]'

function DeploymentRowActions({ appInstanceId, envId, row }: {
  appInstanceId: string
  envId: string
  row: RuntimeInstanceRow
}) {
  const { t } = useTranslation('deployments')
  const [menuOpen, setMenuOpen] = useState(false)
  const openDeployDrawer = useSetAtom(openDeployDrawerAtom)
  const cancelDeployment = useMutation(consoleQuery.enterprise.appDeploy.cancelRuntimeDeployment.mutationOptions())
  const undeployDeployment = useMutation(consoleQuery.enterprise.appDeploy.undeployRuntimeInstance.mutationOptions())
  const isUndeployed = isUndeployedDeploymentRow(row)
  const status = deploymentStatus(row)

  function handleRuntimeAction() {
    const runtimeInstanceId = row.id ?? ''
    setMenuOpen(false)

    if (status === 'deploying') {
      cancelDeployment.mutate({
        params: {
          appInstanceId,
          runtimeInstanceId,
        },
        body: {
          appInstanceId,
          runtimeInstanceId,
        },
      })
      return
    }

    undeployDeployment.mutate({
      params: {
        appInstanceId,
        runtimeInstanceId,
      },
      body: {
        appInstanceId,
        runtimeInstanceId,
      },
    })
  }

  return (
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
        <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            aria-label={t('deployTab.moreActions')}
            className="flex size-7 items-center justify-center rounded-md text-text-tertiary hover:bg-state-base-hover hover:text-text-secondary"
          >
            <span className="i-ri-more-line size-4" />
          </DropdownMenuTrigger>
          {menuOpen && (
            <DropdownMenuContent placement="bottom-end" sideOffset={4} popupClassName="w-50">
              <DropdownMenuItem
                className="gap-2 px-3"
                onClick={handleRuntimeAction}
              >
                <span className="system-sm-regular text-text-destructive">
                  {status === 'deploying' ? t('deployTab.cancelDeployment') : t('deployTab.undeploy')}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      )}
    </div>
  )
}

function DeploymentEnvironmentRow({ appInstanceId, row, isExpanded, onToggle }: {
  appInstanceId: string
  row: RuntimeInstanceRow
  isExpanded: boolean
  onToggle: (envId: string) => void
}) {
  const { t } = useTranslation('deployments')
  const envId = environmentId(row.environment)
  const isUndeployed = isUndeployedDeploymentRow(row)
  const release = row.currentRelease
  const chevron = !isUndeployed && (
    <span
      className={cn(
        'i-ri-arrow-down-s-line size-4 shrink-0 text-text-tertiary transition-transform',
        isExpanded && 'rotate-180',
      )}
    />
  )

  function handleRowToggle() {
    if (!isUndeployed)
      onToggle(envId)
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (isUndeployed)
      return

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onToggle(envId)
    }
  }

  return (
    <div className="border-b border-divider-subtle last:border-b-0">
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
            <DeploymentRowActions appInstanceId={appInstanceId} envId={envId} row={row} />
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
          <DeploymentRowActions appInstanceId={appInstanceId} envId={envId} row={row} />
          {chevron}
        </div>
      </div>
      {isExpanded && <DeploymentPanel row={row} />}
    </div>
  )
}

export function DeploymentEnvironmentList({ appInstanceId, rows }: {
  appInstanceId: string
  rows: RuntimeInstanceRow[]
}) {
  const { t } = useTranslation('deployments')
  const expandableEnvIds = rows.filter(row => !isUndeployedDeploymentRow(row)).map(row => environmentId(row.environment))
  const [expanded, setExpanded] = useState<string | null>()
  const activeExpanded = expanded === undefined
    ? expandableEnvIds[0] ?? null
    : expanded !== null && expandableEnvIds.includes(expanded)
      ? expanded
      : null

  function toggleExpandedEnv(envId: string) {
    setExpanded((prev) => {
      const current = prev === undefined ? expandableEnvIds[0] ?? null : prev
      return current === envId ? null : envId
    })
  }

  return (
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
        const isExpanded = !isUndeployedDeploymentRow(row) && activeExpanded === envId
        return (
          <DeploymentEnvironmentRow
            key={envId}
            appInstanceId={appInstanceId}
            row={row}
            isExpanded={isExpanded}
            onToggle={toggleExpandedEnv}
          />
        )
      })}
    </div>
  )
}
