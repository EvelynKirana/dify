'use client'

import type { ReactNode } from 'react'
import { cn } from '@langgenius/dify-ui/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { useQueryState } from 'nuqs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { consoleQuery } from '@/service/client'
import { envFilterQueryState } from './query-state'

type EnvironmentFilterOption = {
  value: string
  text: string
  icon: ReactNode
  disabled?: boolean
  disabledReason?: string
}

type FilterEnvironment = {
  id: string
  name: string
  disabled?: boolean
  disabledReason?: string
}

function getEnvironmentId(env: FilterEnvironment) {
  return env.id
}

function getEnvironmentFilterOption(env: FilterEnvironment): EnvironmentFilterOption {
  return {
    value: env.id,
    text: env.name,
    icon: <span className="i-ri-stack-line h-[14px] w-[14px]" />,
    disabled: env.disabled,
    disabledReason: env.disabledReason,
  }
}

export function EnvironmentFilter() {
  const { t } = useTranslation('deployments')
  const [open, setOpen] = useState(false)
  const [envFilter, setEnvFilter] = useQueryState('env', envFilterQueryState)
  const { data: environmentOptionsReply } = useQuery(consoleQuery.enterprise.appDeploy.listDeploymentEnvironmentOptions.queryOptions())
  const environmentOptions = environmentOptionsReply?.environments ?? []

  function getFilterEnvironment(env: (typeof environmentOptions)[number]): FilterEnvironment[] {
    if (!env.id)
      return []
    return [{
      id: env.id,
      name: env.name || env.id,
      disabled: env.deployable === false,
      disabledReason: env.disabledReason,
    }]
  }

  const environments = environmentOptions.flatMap(getFilterEnvironment)
  const envIdSet = new Set(environments.map(getEnvironmentId))
  const activeFilter = envFilter === 'all' || envFilter === 'not-deployed' || envIdSet.has(envFilter)
    ? envFilter
    : 'all'
  const filterOptions: EnvironmentFilterOption[] = [
    {
      value: 'all',
      text: t('filter.allEnvs'),
      icon: <span className="i-ri-apps-2-line h-[14px] w-[14px]" />,
    },
    ...environments.map(getEnvironmentFilterOption),
    {
      value: 'not-deployed',
      text: t('filter.notDeployed'),
      icon: <span className="i-ri-inbox-line h-[14px] w-[14px]" />,
    },
  ]
  const selectedOption = filterOptions.find(option => option.value === activeFilter) ?? filterOptions[0]

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          'flex h-8 cursor-pointer items-center gap-1 rounded-lg border-[0.5px] border-transparent bg-components-input-bg-normal px-2 text-left select-none',
          open && 'shadow-xs',
        )}
      >
        <div className="p-px text-text-tertiary">
          {selectedOption?.icon}
        </div>
        <div className="max-w-[160px] min-w-0 truncate text-[13px] leading-[18px] text-text-secondary">
          {selectedOption?.text}
        </div>
        <div className="shrink-0 p-px">
          <span className={cn('i-ri-arrow-down-s-line h-3.5 w-3.5 text-text-tertiary transition-transform', open && 'rotate-180')} />
        </div>
      </DropdownMenuTrigger>
      {open && (
        <DropdownMenuContent
          placement="bottom-start"
          sideOffset={4}
          popupClassName="w-[240px] rounded-lg border-[0.5px] border-components-panel-border bg-components-panel-bg-blur shadow-lg backdrop-blur-[5px]"
        >
          <div className="max-h-72 overflow-auto p-1">
            {filterOptions.map(option => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => {
                  if (option.disabled)
                    return
                  void setEnvFilter(option.value)
                  setOpen(false)
                }}
                title={option.disabled ? option.disabledReason : undefined}
                aria-disabled={option.disabled}
                className={cn(
                  'flex items-center gap-2 rounded-lg py-[6px] pr-2 pl-3 select-none',
                  option.disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:bg-state-base-hover',
                )}
              >
                <span className="shrink-0 text-text-tertiary">{option.icon}</span>
                <span className="grow truncate text-sm leading-5 text-text-tertiary">{option.text}</span>
                {option.value === activeFilter && (
                  <span className="i-custom-vender-line-general-check h-4 w-4 shrink-0 text-text-secondary" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}
