import type { FileTypeSelectOption } from './types'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import Badge from '@/app/components/base/badge'

type TriggerProps = {
  option: FileTypeSelectOption | undefined
}

const Trigger = ({
  option,
}: TriggerProps) => {
  const { t } = useTranslation()

  if (!option)
    return <span className="grow p-1">{t('placeholder.select', { ns: 'common' })}</span>

  return (
    <div className="flex min-w-0 items-center gap-x-0.5">
      <option.Icon className="h-4 w-4 shrink-0 text-text-tertiary" />
      <span className="min-w-0 grow truncate p-1">{option.label}</span>
      <div className="pr-0.5">
        <Badge text={option.type} uppercase={false} />
      </div>
    </div>
  )
}

export default React.memo(Trigger)
