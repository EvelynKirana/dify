'use client'

import type { ReactNode } from 'react'
import { cn } from '@langgenius/dify-ui/cn'
import { toast } from '@langgenius/dify-ui/toast'
import { useTranslation } from 'react-i18next'
import { useCopyFeedback } from './use-copy-feedback'

type SectionProps = {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function Section({ title, description, action, children }: SectionProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-components-panel-border bg-components-panel-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="system-sm-semibold text-text-primary">{title}</div>
          {description && (
            <p className="mt-1 max-w-xl system-xs-regular text-text-tertiary">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

type CopyPillProps = {
  label: string
  value: string
  prefix?: ReactNode
  className?: string
}

export function CopyPill({ label, value, prefix, className }: CopyPillProps) {
  const { t } = useTranslation('deployments')
  const { copied, showCopied } = useCopyFeedback()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      showCopied()
      toast.success(t('access.copyToast'))
    }
    catch {
      toast.error(t('access.copyFailed'))
    }
  }

  return (
    <div
      className={cn(
        'flex h-8 items-center rounded-lg border-[0.5px] border-components-input-border-active bg-components-input-bg-normal pr-1 pl-1.5',
        className,
      )}
    >
      <div className="mr-0.5 flex h-5 shrink-0 items-center rounded-md border border-divider-subtle px-1.5 text-[11px] font-medium text-text-tertiary">
        {label}
      </div>
      {prefix}
      <div className="min-w-0 flex-1 truncate px-1 font-mono text-[13px] font-medium text-text-secondary">
        {value}
      </div>
      <div className="mx-1 h-[14px] w-px shrink-0 bg-divider-regular" />
      <button
        type="button"
        onClick={handleCopy}
        aria-label={t('access.copy')}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-state-base-hover hover:text-text-secondary"
      >
        <span className={cn(copied ? 'i-ri-check-line' : 'i-ri-file-copy-line', 'h-3.5 w-3.5')} />
      </button>
    </div>
  )
}

type EndpointRowProps = {
  envName: string
  label: string
  value: string
  openLabel?: string
}

export function EndpointRow({ envName, label, value, openLabel }: EndpointRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="min-w-[140px] system-xs-regular text-text-tertiary">
        {envName}
      </span>
      <CopyPill label={label} value={value} className="min-w-[260px] flex-1" />
      {openLabel && (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-components-button-secondary-border bg-components-button-secondary-bg px-3 system-sm-medium text-components-button-secondary-text hover:bg-components-button-secondary-bg-hover"
        >
          <span className="i-ri-external-link-line h-3.5 w-3.5" />
          {openLabel}
        </a>
      )}
    </div>
  )
}
