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
        'mb-1 flex w-full items-center rounded-lg px-6 py-[7px] text-left text-[13px] leading-[18px] font-medium text-text-tertiary hover:bg-state-base-hover hover:text-text-secondary',
        disabled
          ? 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-text-tertiary'
          : 'cursor-pointer',
      )}
    >
      <span aria-hidden className={cn('mr-2 h-4 w-4 shrink-0', icon)} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {disabled && (
        <span className="ml-2 shrink-0 rounded-md bg-state-base-hover px-1.5 system-2xs-medium text-text-tertiary">
          {t('newInstance.comingSoon')}
        </span>
      )}
    </button>
  )
}

export function NewInstanceCard() {
  const { t } = useTranslation('deployments')
  const openCreateInstanceModal = useSetAtom(openCreateInstanceModalAtom)

  return (
    <div className="relative col-span-1 inline-flex h-[160px] flex-col justify-between rounded-xl border-[0.5px] border-components-card-border bg-components-card-bg">
      <div className="grow rounded-t-xl p-2">
        <div className="px-6 pt-2 pb-1 text-xs leading-[18px] font-medium text-text-tertiary">
          {t('newInstance.title')}
        </div>
        <NewInstanceAction
          icon="i-ri-stack-line"
          label={t('newInstance.fromStudio')}
          onClick={openCreateInstanceModal}
        />
        <NewInstanceAction
          icon="i-ri-file-code-line"
          label={t('newInstance.importDSL')}
          disabled
        />
      </div>
    </div>
  )
}
