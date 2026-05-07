'use client'

import type { ReactNode } from 'react'
import { cn } from '@langgenius/dify-ui/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { useState } from 'react'

export type EnvironmentFilterOption = {
  value: string
  text: string
  icon: ReactNode
  disabled?: boolean
  disabledReason?: string
}

type EnvironmentFilterProps = {
  value: string
  options: EnvironmentFilterOption[]
  onChange: (value: string) => void
}

export function EnvironmentFilter({ value, options, onChange }: EnvironmentFilterProps) {
  const [open, setOpen] = useState(false)
  const selectedOption = options.find(option => option.value === value) ?? options[0]

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
            {options.map(option => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => {
                  if (option.disabled)
                    return
                  onChange(option.value)
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
                {option.value === value && (
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
