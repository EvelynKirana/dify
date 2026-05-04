'use client'

import type { FC } from 'react'
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
import { deploymentEnvironmentDeploymentsQueryOptions } from '../../queries'
import { useDeploymentsStore } from '../../store'
import {
  activeRelease,
  deployedRows,
  deploymentStatus,
  environmentId,
  environmentName,
  environmentOptionsFromOptionsReply,
} from '../../utils'

type DeployReleaseMenuProps = {
  appInstanceId: string
  releaseId: string
}

export const DeployReleaseMenu: FC<DeployReleaseMenuProps> = ({ appInstanceId, releaseId }) => {
  const { t } = useTranslation('deployments')
  const openDeployDrawer = useDeploymentsStore(state => state.openDeployDrawer)
  const [open, setOpen] = useState(false)
  const { data: environmentDeployments } = useQuery({
    ...deploymentEnvironmentDeploymentsQueryOptions(appInstanceId),
    enabled: open,
  })
  const { data: environmentOptionsReply } = useQuery({
    ...consoleQuery.enterprise.appDeploy.listDeploymentEnvironmentOptions.queryOptions(),
    enabled: open,
  })

  const environmentOptions = useMemo(
    () => environmentOptionsFromOptionsReply(environmentOptionsReply),
    [environmentOptionsReply],
  )
  const environments = environmentOptions.filter(env => env.id)
  const deploymentRows = deployedRows(environmentDeployments?.data)

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
                  openDeployDrawer({ appInstanceId, environmentId: envId, releaseId })
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
