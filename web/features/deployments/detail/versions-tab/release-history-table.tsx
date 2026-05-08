'use client'

import type { ReleaseRow, RuntimeInstanceRow } from '@dify/contracts/enterprise/types.gen'
import { cn } from '@langgenius/dify-ui/cn'
import { Tooltip, TooltipContent, TooltipTrigger } from '@langgenius/dify-ui/tooltip'
import { useTranslation } from 'react-i18next'
import {
  formatDate,
  releaseCommit,
  releaseLabel,
} from '../../utils'
import { DeployReleaseMenu } from './deploy-release-menu'
import { DeployedToBadge } from './deployed-to-badge'
import { getReleaseDeployments } from './release-deployments'

const GRID_TEMPLATE = 'grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.5fr)_96px]'

export function ReleaseHistoryTable({ appInstanceId, releaseRows, deploymentRows }: {
  appInstanceId: string
  releaseRows: ReleaseRow[]
  deploymentRows: RuntimeInstanceRow[]
}) {
  const { t } = useTranslation('deployments')

  return (
    <div className="overflow-hidden rounded-xl border border-components-panel-border bg-components-panel-bg">
      <div className={cn(
        'hidden items-center gap-4 border-b border-divider-subtle px-4 py-3 system-xs-medium-uppercase text-text-tertiary pc:grid',
        GRID_TEMPLATE,
      )}
      >
        <div>{t('versions.col.release')}</div>
        <div>{t('versions.col.createdAt')}</div>
        <div>{t('versions.col.author')}</div>
        <div>{t('versions.col.deployedTo')}</div>
        <div className="text-right">{t('versions.col.action')}</div>
      </div>

      {releaseRows.map((row) => {
        const release = row
        const releaseDeployments = getReleaseDeployments(row, deploymentRows)
        return (
          <div key={release.id} className="border-b border-divider-subtle last:border-b-0">
            <div className="flex flex-col gap-3 p-4 pc:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Tooltip>
                    <TooltipTrigger
                      render={(
                        <span className="inline-flex max-w-full cursor-default truncate font-mono system-sm-medium text-text-primary">
                          {releaseLabel(release)}
                        </span>
                      )}
                    />
                    <TooltipContent>
                      {t('versions.commitTooltip', { commit: releaseCommit(release) })}
                    </TooltipContent>
                  </Tooltip>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 system-xs-regular text-text-secondary">
                    <span>{formatDate(release.createdAt)}</span>
                    <span aria-hidden>·</span>
                    <span>{row.createdBy?.name ?? '—'}</span>
                  </div>
                </div>
                <div className="flex shrink-0 justify-end gap-1">
                  <DeployReleaseMenu releaseId={release.id!} appInstanceId={appInstanceId} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="shrink-0 system-xs-medium-uppercase text-text-tertiary">
                  {t('versions.col.deployedTo')}
                </div>
                <div className="flex min-w-0 flex-wrap gap-1">
                  {releaseDeployments.length === 0
                    ? <span className="system-sm-regular text-text-quaternary">—</span>
                    : releaseDeployments.map(item => (
                        <DeployedToBadge
                          key={`${item.environmentId}-${item.state}`}
                          item={item}
                        />
                      ))}
                </div>
              </div>
            </div>
            <div className={cn(
              'hidden items-center gap-4 px-4 py-3 pc:grid',
              GRID_TEMPLATE,
            )}
            >
              <div>
                <Tooltip>
                  <TooltipTrigger
                    render={(
                      <span className="inline-flex cursor-default font-mono system-sm-medium text-text-primary">
                        {releaseLabel(release)}
                      </span>
                    )}
                  />
                  <TooltipContent>
                    {t('versions.commitTooltip', { commit: releaseCommit(release) })}
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="system-sm-regular text-text-secondary">{formatDate(release.createdAt)}</div>
              <div className="system-sm-regular text-text-secondary">{row.createdBy?.name ?? '—'}</div>
              <div className="flex flex-wrap gap-1">
                {releaseDeployments.length === 0
                  ? <span className="system-sm-regular text-text-quaternary">—</span>
                  : releaseDeployments.map(item => (
                      <DeployedToBadge
                        key={`${item.environmentId}-${item.state}`}
                        item={item}
                      />
                    ))}
              </div>
              <div className="flex justify-end gap-1">
                <DeployReleaseMenu releaseId={release.id!} appInstanceId={appInstanceId} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
