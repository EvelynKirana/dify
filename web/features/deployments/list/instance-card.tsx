'use client'

import type { FC, MouseEvent } from 'react'
import type { AppInfo } from '../types'
import type { AppDeploymentSummary } from '@/contract/console/deployments'
import type { AppModeEnum } from '@/types/app'
import { cn } from '@langgenius/dify-ui/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@langgenius/dify-ui/tooltip'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppTypeIcon } from '@/app/components/app/type-selector'
import AppIcon from '@/app/components/base/app-icon'
import { useFormatTimeFromNow } from '@/hooks/use-format-time-from-now'
import { useRouter } from '@/next/navigation'
import { useDeploymentsStore } from '../store'

type InstanceCardProps = {
  app: AppInfo
  summary?: AppDeploymentSummary
}

export const InstanceCard: FC<InstanceCardProps> = ({ app, summary }) => {
  const { t } = useTranslation('deployments')
  const router = useRouter()
  const { formatTimeFromNow } = useFormatTimeFromNow()
  const [menuOpen, setMenuOpen] = useState(false)
  const openDeployDrawer = useDeploymentsStore(state => state.openDeployDrawer)

  const navigateToDetail = () => router.push(`/deployments/${app.id}/overview`)

  const handleMenuAction = (e: MouseEvent<HTMLElement>, action: () => void) => {
    e.stopPropagation()
    e.preventDefault()
    setMenuOpen(false)
    action()
  }

  const statusCount = (status: string) =>
    summary?.statuses?.find(item => item.status === status)?.count ?? 0
  const failedCount = statusCount('failed') + statusCount('deploy_failed')
  const deployingCount = statusCount('deploying')
  const readyCount = statusCount('ready')
  const envCount = failedCount + deployingCount + readyCount

  const lastDeployedAt = summary?.lastDeployedAt
    ? new Date(summary.lastDeployedAt).getTime()
    : null

  const primaryStatus: 'none' | 'failed' | 'deploying' | 'ready' = envCount === 0
    ? 'none'
    : failedCount > 0
      ? 'failed'
      : deployingCount > 0
        ? 'deploying'
        : 'ready'

  const primaryText = primaryStatus === 'none'
    ? t('card.notDeployed')
    : primaryStatus === 'failed'
      ? t('card.failed', { count: failedCount })
      : primaryStatus === 'deploying'
        ? t('card.deploying', { count: deployingCount })
        : t('card.ready', { count: readyCount })

  const secondaryParts: string[] = []
  if (primaryStatus === 'failed' && deployingCount > 0)
    secondaryParts.push(t('card.deploying', { count: deployingCount }))
  if ((primaryStatus === 'failed' || primaryStatus === 'deploying') && readyCount > 0)
    secondaryParts.push(t('card.ready', { count: readyCount }))

  const statusSummaryLabel = (status?: string) => {
    if (status === 'failed' || status === 'deploy_failed')
      return t('status.deployFailed')
    if (status === 'deploying')
      return t('status.deploying')
    if (status === 'ready')
      return t('status.ready')
    return status || 'unknown'
  }

  const statusSummaryTooltip = summary?.statuses?.filter(item => item.count && item.status !== 'undeployed') ?? []
  const statusTooltip = primaryStatus === 'none'
    ? t('card.tooltip.notDeployed')
    : (
        <div className="flex min-w-[180px] flex-col gap-1">
          <div className="system-xs-medium text-text-secondary">{t('overview.deploymentStatus')}</div>
          {statusSummaryTooltip.map(item => (
            <div key={item.status} className="flex justify-between gap-3">
              <span className="text-text-tertiary">{statusSummaryLabel(item.status)}</span>
              <span className="text-text-secondary">{item.count}</span>
            </div>
          ))}
        </div>
      )

  const healthPillClass = primaryStatus === 'none'
    ? 'text-text-tertiary bg-background-section-burn'
    : primaryStatus === 'failed'
      ? 'text-util-colors-red-red-700 bg-util-colors-red-red-50'
      : primaryStatus === 'deploying'
        ? 'text-util-colors-warning-warning-700 bg-util-colors-warning-warning-50'
        : 'text-util-colors-green-green-700 bg-util-colors-green-green-50'

  const healthDotClass = primaryStatus === 'none'
    ? 'bg-text-quaternary'
    : primaryStatus === 'failed'
      ? 'bg-util-colors-red-red-500'
      : primaryStatus === 'deploying'
        ? 'bg-util-colors-warning-warning-500 animate-pulse'
        : 'bg-util-colors-green-green-500'

  const appModeLabel = t(`appMode.${app.mode}`, { defaultValue: app.mode })

  return (
    <div
      onClick={(e) => {
        e.preventDefault()
        navigateToDetail()
      }}
      className="group relative col-span-1 inline-flex h-[160px] cursor-pointer flex-col rounded-xl border border-solid border-components-card-border bg-components-card-bg shadow-sm transition-all duration-200 ease-in-out hover:shadow-lg"
    >
      <div className="flex h-[66px] shrink-0 grow-0 items-center gap-3 px-[14px] pt-[14px] pb-3">
        <div className="relative shrink-0">
          <AppIcon
            size="large"
            iconType={app.iconType}
            icon={app.icon}
            background={app.iconBackground}
            imageUrl={app.iconUrl}
          />
          <AppTypeIcon
            type={app.mode as unknown as AppModeEnum}
            wrapperClassName="absolute -bottom-0.5 -right-0.5 w-4 h-4 shadow-sm"
            className="h-3 w-3"
          />
        </div>
        <div className="w-0 grow py-px">
          <div className="flex items-center text-sm leading-5 font-semibold text-text-secondary">
            <div className="truncate" title={app.name}>{app.name}</div>
          </div>
          <div className="truncate text-[10px] leading-[18px] font-medium text-text-tertiary" title={appModeLabel}>
            {appModeLabel}
          </div>
        </div>
      </div>
      <div className="flex grow flex-col gap-2 px-[14px]">
        <Tooltip>
          <TooltipTrigger
            render={(
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 system-xs-medium',
                    healthPillClass,
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', healthDotClass)} />
                  {primaryText}
                </span>
                {secondaryParts.length > 0 && (
                  <span className="truncate system-xs-regular text-text-tertiary">
                    {secondaryParts.join(' · ')}
                  </span>
                )}
              </div>
            )}
          />
          <TooltipContent>{statusTooltip}</TooltipContent>
        </Tooltip>
        <div className="flex min-w-0 items-center gap-1.5 system-xs-regular text-text-tertiary">
          <span aria-hidden className="i-ri-apps-2-line h-3.5 w-3.5 shrink-0 text-text-quaternary" />
          <span className="truncate" title={app.sourceAppName ?? app.name}>
            {t('card.fromApp', { name: app.sourceAppName ?? app.name })}
          </span>
        </div>
      </div>
      <div className="absolute right-0 bottom-1 left-0 flex h-[42px] shrink-0 items-center pt-1 pr-[6px] pb-[6px] pl-[14px]">
        <div className="mr-[41px] flex min-w-0 grow items-center gap-1.5 system-xs-regular text-text-tertiary">
          <span aria-hidden className="i-ri-time-line h-3.5 w-3.5 shrink-0 text-text-quaternary" />
          <span className="truncate">
            {lastDeployedAt
              ? t('card.lastDeployed', { time: formatTimeFromNow(lastDeployedAt) })
              : t('card.neverDeployed')}
          </span>
        </div>
        <div
          className={cn(
            'absolute top-1/2 right-[6px] flex -translate-y-1/2 items-center transition-opacity',
            menuOpen
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100',
          )}
        >
          <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger
              aria-label={t('card.moreActions')}
              className={cn(
                menuOpen ? 'bg-state-base-hover shadow-none' : 'bg-transparent',
                'flex h-8 w-8 items-center justify-center rounded-md border-none p-2 hover:bg-state-base-hover',
              )}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
            >
              <span aria-hidden className="i-ri-more-fill h-4 w-4 text-text-tertiary" />
            </DropdownMenuTrigger>
            {menuOpen && (
              <DropdownMenuContent placement="bottom-end" sideOffset={4} popupClassName="w-[216px]">
                <DropdownMenuItem
                  className="gap-2 px-3"
                  onClick={e => handleMenuAction(e, () => openDeployDrawer({ appInstanceId: app.id }))}
                >
                  <span className="system-sm-regular text-text-secondary">{t('card.menu.deploy')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 px-3"
                  onClick={e => handleMenuAction(e, navigateToDetail)}
                >
                  <span className="system-sm-regular text-text-secondary">{t('card.menu.viewDetail')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  aria-disabled
                  title={t('card.menu.deleteDisabled')}
                  className="cursor-not-allowed gap-2 px-3 opacity-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                  }}
                >
                  <span className="system-sm-regular text-text-destructive">{t('card.menu.delete')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
