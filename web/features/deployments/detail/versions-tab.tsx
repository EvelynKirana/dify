'use client'
import type { FC } from 'react'
import { cn } from '@langgenius/dify-ui/cn'
import { Tooltip, TooltipContent, TooltipTrigger } from '@langgenius/dify-ui/tooltip'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCachedDeploymentAppData } from '../hooks/use-deployment-data'
import {
  deployedRows,
  formatDate,
  releaseCommit,
  releaseLabel,
} from '../utils'
import { DeployReleaseMenu } from './versions-tab/deploy-release-menu'
import { DeployedToBadge } from './versions-tab/deployed-to-badge'
import { getReleaseDeployments } from './versions-tab/release-deployments'

const GRID_TEMPLATE = 'grid-cols-[0.9fr_1fr_0.8fr_1.5fr_auto]'

type VersionsTabProps = {
  instanceId: string
}

const VersionsTab: FC<VersionsTabProps> = ({ instanceId: appId }) => {
  const { t } = useTranslation('deployments')
  const { data: appData } = useCachedDeploymentAppData(appId)
  const releaseRows = useMemo(
    () => appData?.releaseHistory.data?.filter(row => (row.release ?? row).id) ?? [],
    [appData?.releaseHistory.data],
  )
  const deploymentRows = useMemo(
    () => deployedRows(appData?.environmentDeployments.data),
    [appData?.environmentDeployments.data],
  )

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="system-sm-semibold text-text-primary">
          {t('versions.releaseHistory')}
          {' '}
          <span className="system-sm-regular text-text-tertiary">
            (
            {releaseRows.length}
            )
          </span>
        </div>
      </div>

      {releaseRows.length === 0
        ? (
            <div className="rounded-xl border border-dashed border-components-panel-border bg-components-panel-bg-blur px-4 py-12 text-center system-sm-regular text-text-tertiary">
              {t('versions.empty')}
            </div>
          )
        : (
            <div className="overflow-hidden rounded-xl border border-components-panel-border bg-components-panel-bg">
              <div className={cn(
                'hidden items-center gap-4 border-b border-divider-subtle px-4 py-3 system-xs-medium-uppercase text-text-tertiary lg:grid',
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
                const release = row.release ?? row
                const releaseDeployments = getReleaseDeployments(row, deploymentRows)
                return (
                  <div key={release.id} className="border-b border-divider-subtle last:border-b-0">
                    <div className="flex flex-col gap-3 px-4 py-3 lg:hidden">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="system-xs-medium-uppercase text-text-tertiary">
                            {t('versions.col.release')}
                          </div>
                          <Tooltip>
                            <TooltipTrigger
                              render={(
                                <span className="mt-1 inline-flex max-w-full cursor-default truncate font-mono system-sm-medium text-text-primary">
                                  {releaseLabel(release)}
                                </span>
                              )}
                            />
                            <TooltipContent>
                              {t('versions.commitTooltip', { commit: releaseCommit(release) })}
                            </TooltipContent>
                          </Tooltip>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 system-xs-regular text-text-tertiary">
                            <span>{formatDate(release.createdAt)}</span>
                            <span aria-hidden>·</span>
                            <span>{row.createdBy?.displayName ?? row.createdBy?.name ?? '—'}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 justify-end gap-1">
                          <DeployReleaseMenu releaseId={release.id!} appId={appId} />
                        </div>
                      </div>
                      <div>
                        <div className="system-xs-medium-uppercase text-text-tertiary">
                          {t('versions.col.deployedTo')}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
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
                      'hidden items-center gap-4 px-4 py-3 lg:grid',
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
                      <div className="system-sm-regular text-text-secondary">{row.createdBy?.displayName ?? row.createdBy?.name ?? '—'}</div>
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
                        <DeployReleaseMenu releaseId={release.id!} appId={appId} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
    </div>
  )
}

export default VersionsTab
