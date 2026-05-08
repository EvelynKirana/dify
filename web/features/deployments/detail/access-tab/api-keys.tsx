'use client'

import type { ConsoleEnvironment, DeveloperApiKeyRow } from '@dify/contracts/enterprise/types.gen'
import { cn } from '@langgenius/dify-ui/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { toast } from '@langgenius/dify-ui/toast'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { environmentName } from '../../utils'
import { useCopyFeedback } from './use-copy-feedback'

export function ApiKeyRow({ apiKey, onCopy, onRevoke }: {
  apiKey: DeveloperApiKeyRow
  onCopy: (apiKeyId: string) => Promise<string>
  onRevoke: (apiKeyId: string) => void
}) {
  const { t } = useTranslation('deployments')
  const { copied, showCopied } = useCopyFeedback()
  const displayValue = apiKey.maskedKey || apiKey.id || '—'
  const environmentLabel = environmentName(apiKey.environment)

  const handleCopy = async () => {
    if (!apiKey.id)
      return

    try {
      const token = await onCopy(apiKey.id)
      await navigator.clipboard.writeText(token)
      showCopied()
      toast.success(t('access.copyToast'))
    }
    catch {
      toast.error(t('access.copyFailed'))
    }
  }

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex min-w-[140px] flex-col">
        <span className="system-sm-medium text-text-primary">{apiKey.name || apiKey.id}</span>
        <span className="system-xs-regular text-text-tertiary">
          {t('access.api.envPrefix', { env: environmentLabel })}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg border-[0.5px] border-components-input-border-active bg-components-input-bg-normal pr-1 pl-2">
        <div className="min-w-0 flex-1 truncate font-mono text-[13px] font-medium text-text-secondary">
          {displayValue}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={t('access.copy')}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-state-base-hover hover:text-text-secondary"
        >
          <span className={cn(copied ? 'i-ri-check-line' : 'i-ri-file-copy-line', 'h-3.5 w-3.5')} />
        </button>
        <button
          type="button"
          onClick={() => apiKey.id && onRevoke(apiKey.id)}
          aria-label={t('access.revoke')}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-state-destructive-hover hover:text-text-destructive"
        >
          <span className="i-ri-delete-bin-line h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export function ApiKeyGenerateMenu({ environments, onGenerate }: {
  environments: ConsoleEnvironment[]
  onGenerate: (environmentId: string) => void
}) {
  const { t } = useTranslation('deployments')
  const [open, setOpen] = useState(false)
  const selectableEnvironments = environments.filter(env => env.id)
  const disabled = selectableEnvironments.length === 0

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 system-sm-medium',
          'border border-components-button-secondary-border bg-components-button-secondary-bg text-components-button-secondary-text',
          'hover:bg-components-button-secondary-bg-hover',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className="i-ri-add-line h-3.5 w-3.5" />
        {t('access.api.newKey')}
        <span className="i-ri-arrow-down-s-line h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      {open && !disabled && (
        <DropdownMenuContent placement="bottom-end" sideOffset={4} popupClassName="w-[220px]">
          {selectableEnvironments.map(env => (
            <DropdownMenuItem
              key={env.id}
              className="gap-2 px-3"
              onClick={() => {
                setOpen(false)
                onGenerate(env.id!)
              }}
            >
              <span className="system-sm-regular text-text-secondary">
                {t('access.api.newKeyForEnv', { env: environmentName(env) })}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}
