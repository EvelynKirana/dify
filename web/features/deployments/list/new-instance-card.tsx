'use client'

import { cn } from '@langgenius/dify-ui/cn'
import { useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { openCreateInstanceModalAtom } from '../store'

type NewInstanceActionProps = {
  icon: string
  label: string
  disabled?: boolean
  onClick?: () => void
}

function NewInstanceAction({ icon, label, disabled, onClick }: NewInstanceActionProps) {
  const { t } = useTranslation('deployments')

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? t('newInstance.comingSoon') : undefined}
      className={cn(
        'mb-1 flex h-8 w-full items-center gap-2 rounded-lg px-6 text-left system-sm-medium text-text-tertiary hover:bg-state-base-hover hover:text-text-secondary',
        disabled
          ? 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-text-tertiary'
          : 'cursor-pointer',
      )}
    >
      <span aria-hidden className={cn('size-4 shrink-0', icon)} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {disabled && (
        <span className="shrink-0 rounded-md bg-state-base-hover px-1.5 system-2xs-medium text-text-tertiary">
          {t('newInstance.comingSoon')}
        </span>
      )}
    </button>
  )
}

function CreateFromStudioAction() {
  const { t } = useTranslation('deployments')
  const openCreateInstanceModal = useSetAtom(openCreateInstanceModalAtom)

  return (
    <NewInstanceAction
      icon="i-ri-stack-line"
      label={t('newInstance.fromStudio')}
      onClick={openCreateInstanceModal}
    />
  )
}

export function NewInstanceCard() {
  const { t } = useTranslation('deployments')

  return (
    <div className="relative col-span-1 inline-flex h-40 flex-col justify-between rounded-xl border border-components-card-border bg-components-card-bg">
      <div className="grow rounded-t-xl p-2">
        <div className="px-6 pt-2 pb-1 text-xs/[18px] font-medium text-text-tertiary">
          {t('newInstance.title')}
        </div>
        <CreateFromStudioAction />
        <NewInstanceAction
          icon="i-ri-file-code-line"
          label={t('newInstance.importDSL')}
          disabled
        />
      </div>
    </div>
  )
}
