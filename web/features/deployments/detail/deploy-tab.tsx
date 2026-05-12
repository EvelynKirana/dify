'use client'
import type { DeploymentEnvironmentOption } from '@dify/contracts/enterprise/types.gen'
import { cn } from '@langgenius/dify-ui/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { useSetAtom } from 'jotai'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SkeletonRectangle, SkeletonRow } from '@/app/components/base/skeleton'
import { consoleQuery } from '@/service/client'
import { environmentId, environmentName } from '../environment'
import { isUndeployedDeploymentRow } from '../runtime-status'
import { openDeployDrawerAtom } from '../store'
import { SectionState } from './common'
import { DeploymentEnvironmentList } from './deploy-tab/deployment-environment-list'

type EnvironmentOption = DeploymentEnvironmentOption & {
  disabled?: boolean
}

function NewDeploymentMenu({ appInstanceId, availableEnvs }: {
  appInstanceId: string
  availableEnvs: EnvironmentOption[]
}) {
  const { t } = useTranslation('deployments')
  const openDeployDrawer = useSetAtom(openDeployDrawerAtom)
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-3 system-sm-medium',
          'border border-components-button-primary-border bg-components-button-primary-bg text-components-button-primary-text',
          'hover:bg-components-button-primary-bg-hover',
        )}
      >
        <span className="i-ri-rocket-line size-3.5" />
        {t('deployTab.newDeployment')}
        <span className="i-ri-arrow-down-s-line size-3.5" />
      </DropdownMenuTrigger>
      {open && (
        <DropdownMenuContent placement="bottom-end" sideOffset={4} popupClassName="w-55">
          <DropdownMenuItem
            className="gap-2 px-3"
            onClick={() => {
              setOpen(false)
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
                    setOpen(false)
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
  )
}

function NewDeploymentMenuSkeleton() {
  return <SkeletonRectangle className="my-0 h-8 w-36 animate-pulse rounded-lg" />
}

const DEPLOYMENT_TABLE_HEADER_SKELETON_KEYS = ['environment', 'release', 'updated-at', 'actions']
const DEPLOYMENT_TABLE_ROW_SKELETON_KEYS = ['production', 'staging', 'development', 'preview']

function DeploymentEnvironmentListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-components-panel-border bg-components-panel-bg">
      <div className="hidden items-center gap-4 border-b border-divider-subtle px-4 py-3 lg:grid lg:grid-cols-[minmax(180px,1fr)_minmax(140px,0.75fr)_minmax(180px,0.85fr)_240px]">
        {DEPLOYMENT_TABLE_HEADER_SKELETON_KEYS.map(key => (
          <SkeletonRectangle key={key} className="h-3 w-24 animate-pulse" />
        ))}
      </div>
      {DEPLOYMENT_TABLE_ROW_SKELETON_KEYS.map(key => (
        <div key={key} className="border-b border-divider-subtle last:border-b-0">
          <div className="flex w-full flex-col gap-2 px-4 py-3 lg:grid lg:grid-cols-[minmax(180px,1fr)_minmax(140px,0.75fr)_minmax(180px,0.85fr)_240px] lg:items-center lg:gap-4">
            <div className="flex min-w-0 items-start justify-between gap-3 lg:block">
              <div className="flex min-w-0 flex-col gap-1.5">
                <SkeletonRectangle className="h-3 w-32 animate-pulse" />
                <SkeletonRectangle className="h-2.5 w-24 animate-pulse" />
              </div>
              <div className="flex shrink-0 items-center gap-1 lg:hidden">
                <SkeletonRectangle className="my-0 h-7 w-28 animate-pulse rounded-lg" />
                <SkeletonRectangle className="my-0 size-4 animate-pulse rounded" />
              </div>
            </div>
            <SkeletonRow className="gap-2">
              <SkeletonRectangle className="h-3 w-32 animate-pulse" />
              <SkeletonRectangle className="h-2.5 w-14 animate-pulse" />
            </SkeletonRow>
            <div className="min-w-0">
              <SkeletonRectangle className="my-0 h-5 w-36 animate-pulse rounded-md" />
            </div>
            <div className="hidden justify-end lg:flex">
              <SkeletonRectangle className="my-0 h-7 w-32 animate-pulse rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function DeployTab({ appInstanceId }: {
  appInstanceId: string
}) {
  const { t } = useTranslation('deployments')
  const environmentDeploymentsQuery = useQuery(consoleQuery.enterprise.appDeploy.listRuntimeInstances.queryOptions({
    input: {
      params: { appInstanceId },
    },
  }))
  const environmentOptionsQuery = useQuery(consoleQuery.enterprise.appDeploy.listDeploymentEnvironmentOptions.queryOptions())
  const environmentDeployments = environmentDeploymentsQuery.data
  const environmentOptionsReply = environmentOptionsQuery.data
  const environmentOptions = environmentOptionsReply?.environments
    ?.filter(environment => environment.id)
    .map(environment => ({
      ...environment,
      disabled: environment.deployable === false,
    })) ?? []
  const rows = environmentDeployments?.data?.filter(row => row.environment?.id) ?? []
  const deployedRuntimeRows = rows.filter(row => !isUndeployedDeploymentRow(row))

  const deployedEnvIds = new Set(deployedRuntimeRows.map(row => environmentId(row.environment)))
  const availableEnvs = environmentOptions.filter(env => env.id && !deployedEnvIds.has(env.id))
  const isLoading = environmentDeploymentsQuery.isLoading || environmentOptionsQuery.isLoading
  const hasError = environmentDeploymentsQuery.isError || environmentOptionsQuery.isError

  return (
    <div className="flex w-full max-w-240 flex-col gap-4 p-6">
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
        {isLoading
          ? <NewDeploymentMenuSkeleton />
          : !hasError && <NewDeploymentMenu appInstanceId={appInstanceId} availableEnvs={availableEnvs} />}
      </div>

      {isLoading
        ? <DeploymentEnvironmentListSkeleton />
        : hasError
          ? <SectionState>{t('common.loadFailed')}</SectionState>
          : rows.length === 0
            ? (
                <div className="rounded-xl border border-dashed border-components-panel-border bg-components-panel-bg-blur px-4 py-12 text-center system-sm-regular text-text-tertiary">
                  {t('deployTab.empty')}
                </div>
              )
            : (
                <DeploymentEnvironmentList appInstanceId={appInstanceId} rows={rows} />
              )}
    </div>
  )
}
