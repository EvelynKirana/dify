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
import { consoleQuery } from '@/service/client'
import { environmentId, environmentName } from '../environment'
import { isUndeployedDeploymentRow } from '../runtime-status'
import { openDeployDrawerAtom } from '../store'
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

export function DeployTab({ appInstanceId }: {
  appInstanceId: string
}) {
  const { t } = useTranslation('deployments')
  const { data: environmentDeployments } = useQuery(consoleQuery.enterprise.appDeploy.listRuntimeInstances.queryOptions({
    input: {
      params: { appInstanceId },
    },
  }))
  const { data: environmentOptionsReply } = useQuery(consoleQuery.enterprise.appDeploy.listDeploymentEnvironmentOptions.queryOptions())
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
        <NewDeploymentMenu appInstanceId={appInstanceId} availableEnvs={availableEnvs} />
      </div>

      {rows.length === 0
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
