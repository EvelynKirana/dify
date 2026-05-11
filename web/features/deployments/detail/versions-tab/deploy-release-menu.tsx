'use client'

import type { ReleaseRow } from '@dify/contracts/enterprise/types.gen'
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
import { environmentId, environmentName } from '../../environment'
import { releaseDeploymentAction } from '../../release-action'
import { deploymentStatus, isUndeployedDeploymentRow } from '../../runtime-status'
import { openDeployDrawerAtom } from '../../store'

export function DeployReleaseMenu({ appInstanceId, releaseId, releaseRows }: {
  appInstanceId: string
  releaseId: string
  releaseRows: ReleaseRow[]
}) {
  const { t } = useTranslation('deployments')
  const openDeployDrawer = useSetAtom(openDeployDrawerAtom)
  const [open, setOpen] = useState(false)
  const { data: environmentDeployments } = useQuery(consoleQuery.enterprise.appDeploy.listRuntimeInstances.queryOptions({
    input: {
      params: { appInstanceId },
    },
    enabled: open,
  }))
  const { data: environmentOptionsReply } = useQuery(consoleQuery.enterprise.appDeploy.listDeploymentEnvironmentOptions.queryOptions({
    enabled: open,
  }))

  const environmentOptions = environmentOptionsReply?.environments
    ?.filter(environment => environment.id)
    .map(environment => ({
      ...environment,
      disabled: environment.deployable === false,
    })) ?? []
  const environments = environmentOptions.filter(env => env.id)
  const deploymentRows = environmentDeployments?.data?.filter(row => Boolean(row.environment?.id) && !isUndeployedDeploymentRow(row)) ?? []
  const targetRelease = releaseRows.find(release => release.id === releaseId) ?? { id: releaseId }

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
        <span className="i-ri-arrow-down-s-line size-3.5" />
      </DropdownMenuTrigger>
      {open && (
        <DropdownMenuContent placement="bottom-end" sideOffset={4} popupClassName="w-55">
          {environments.map((env) => {
            const envId = env.id!
            const row = deploymentRows.find(item => environmentId(item.environment) === envId)
            const currentRelease = row?.currentRelease
            const isCurrent = currentRelease?.id === releaseId
            const isEnvironmentDeploying = row ? deploymentStatus(row) === 'deploying' : false
            const disabled = Boolean(env.disabled || isCurrent || isEnvironmentDeploying)
            const action = releaseDeploymentAction({
              targetRelease,
              currentRelease,
              releaseRows,
              isExistingRelease: true,
            })
            return (
              <DropdownMenuItem
                key={envId}
                className="gap-2 px-3"
                disabled={disabled}
                onClick={() => {
                  setOpen(false)
                  if (disabled)
                    return
                  openDeployDrawer({ appInstanceId, environmentId: envId, releaseId })
                }}
              >
                <span className="system-sm-regular text-text-secondary">
                  {isEnvironmentDeploying
                    ? t('versions.deployingTo', { name: environmentName(env) })
                    : isCurrent
                      ? t('versions.currentOn', { name: environmentName(env) })
                      : row
                        ? t(action === 'rollback' ? 'versions.rollbackTo' : 'versions.promoteTo', { name: environmentName(env) })
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
