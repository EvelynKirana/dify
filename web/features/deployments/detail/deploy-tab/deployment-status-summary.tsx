'use client'

import type { FC } from 'react'
import type { EnvironmentDeploymentRow } from '@/contract/console/deployments'
import { useTranslation } from 'react-i18next'
import {
  activeRelease,
  deploymentStatus,
  releaseLabel,
} from '../../utils'

type DeploymentStatusSummaryProps = {
  row: EnvironmentDeploymentRow
}

export const DeploymentStatusSummary: FC<DeploymentStatusSummaryProps> = ({ row }) => {
  const { t } = useTranslation('deployments')
  const status = deploymentStatus(row)

  if (status === 'deploying') {
    return (
      <span className="inline-flex items-center gap-1.5 system-sm-medium text-util-colors-blue-blue-700">
        <span className="i-ri-loader-4-line h-3.5 w-3.5 animate-spin" />
        {t('deployTab.status.deployingRelease', { release: releaseLabel(activeRelease(row)) })}
      </span>
    )
  }

  if (status === 'deploy_failed') {
    return (
      <span className="inline-flex items-center gap-1.5 system-sm-medium text-util-colors-warning-warning-700">
        <span className="i-ri-alert-line h-3.5 w-3.5" />
        {t('deployTab.status.runningWithFailed')}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 system-sm-medium text-util-colors-green-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-util-colors-green-green-500" />
      {t('status.ready')}
    </span>
  )
}
