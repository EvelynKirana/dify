'use client'

import type { FC } from 'react'
import { cn } from '@langgenius/dify-ui/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSourceApps } from '../../hooks/use-source-apps'
import { useDeploymentsStore } from '../../store'
import {
  activeRelease,
  deployedRows,
  deploymentId,
  deploymentStatus,
  environmentId,
  environmentName,
} from '../../utils'

type DeployReleaseMenuProps = {
  appId: string
  releaseId: string
}

export const DeployReleaseMenu: FC<DeployReleaseMenuProps> = ({ appId, releaseId }) => {
  const { t } = useTranslation('deployments')
  const appData = useDeploymentsStore(state => state.appData[appId])
  const openDeployDrawer = useDeploymentsStore(state => state.openDeployDrawer)
  const openRollbackModal = useDeploymentsStore(state => state.openRollbackModal)
  const [open, setOpen] = useState(false)
  const { environmentOptions } = useSourceApps({ enabled: open })

  const environments = environmentOptions.filter(env => env.id)
  const deploymentRows = deployedRows(appData?.environmentDeployments.data)

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
