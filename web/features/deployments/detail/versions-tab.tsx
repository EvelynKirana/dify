'use client'
import { Button } from '@langgenius/dify-ui/button'
import { cn } from '@langgenius/dify-ui/cn'
import { Dialog, DialogCloseButton, DialogContent, DialogDescription, DialogTitle } from '@langgenius/dify-ui/dialog'
import { toast } from '@langgenius/dify-ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@langgenius/dify-ui/tooltip'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '@/app/components/base/input'
import Textarea from '@/app/components/base/textarea'
import { consoleQuery } from '@/service/client'
import { DEPLOYMENT_PAGE_SIZE } from '../data'
import {
  deployedRows,
  formatDate,
  releaseCommit,
  releaseLabel,
} from '../utils'
import { DeployReleaseMenu } from './versions-tab/deploy-release-menu'
import { DeployedToBadge } from './versions-tab/deployed-to-badge'
import { getReleaseDeployments } from './versions-tab/release-deployments'

const GRID_TEMPLATE = 'grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.5fr)_96px]'

type VersionsTabProps = {
  instanceId: string
}

export function VersionsTab({ instanceId: appId }: VersionsTabProps) {
  const { t } = useTranslation('deployments')
  const input = { params: { appInstanceId: appId } }
  const { data: overview } = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceOverview.queryOptions({
    input,
  }))
  const { data: releaseHistory } = useQuery(consoleQuery.enterprise.appDeploy.listReleases.queryOptions({
    input: {
      ...input,
      query: {
        pageNumber: 1,
        resultsPerPage: DEPLOYMENT_PAGE_SIZE,
      },
    },
  }))
  const { data: environmentDeployments } = useQuery(consoleQuery.enterprise.appDeploy.listRuntimeInstances.queryOptions({
    input,
  }))
  const createRelease = useMutation(consoleQuery.enterprise.appDeploy.createRelease.mutationOptions())
  const [isCreating, setIsCreating] = useState(false)
  const [releaseName, setReleaseName] = useState('')
  const [releaseDescription, setReleaseDescription] = useState('')
  const releaseRows = useMemo(
    () => releaseHistory?.data?.filter(row => row.id) ?? [],
    [releaseHistory?.data],
  )
  const deploymentRows = useMemo(
    () => deployedRows(environmentDeployments?.data),
    [environmentDeployments?.data],
  )
  const canCreateRelease = overview?.instance?.canCreateRelease ?? true
  const trimmedReleaseName = releaseName.trim()
  const canSubmitRelease = Boolean(canCreateRelease && trimmedReleaseName && !createRelease.isPending)

  const handleCreateRelease = async () => {
    if (!canSubmitRelease)
      return

    try {
      const response = await createRelease.mutateAsync({
        params: {
          appInstanceId: appId,
        },
        body: {
          name: trimmedReleaseName,
          description: releaseDescription.trim() || undefined,
        },
      })
      if (!response.release?.id)
        throw new Error('Create release did not return a release.')
      setReleaseName('')
      setReleaseDescription('')
      setIsCreating(false)
    }
    catch {
      toast.error(t('versions.createFailed'))
    }
  }

  return (
    <div className="flex w-full max-w-[960px] flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="system-sm-semibold text-text-primary">
          {t('versions.releaseHistory')}
          {' '}
          <span className="system-sm-regular text-text-tertiary">
            (
            {releaseRows.length}
            )
          </span>
        </div>
        <Button
          size="small"
          variant="primary"
          disabled={!canCreateRelease}
          onClick={() => setIsCreating(true)}
        >
          <span className="i-ri-add-line h-3.5 w-3.5" />
          {t('versions.createRelease')}
        </Button>
      </div>

      {!canCreateRelease && (
        <div className="rounded-lg border border-divider-subtle bg-background-default-subtle px-3 py-2 system-sm-regular text-text-tertiary">
          {t('versions.sourceAppUnavailable')}
        </div>
      )}

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="w-[560px] overflow-hidden p-0">
          <DialogCloseButton />
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void handleCreateRelease()
            }}
          >
            <div className="flex items-start gap-3 border-b border-divider-subtle px-6 py-5 pr-14">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-state-accent-hover text-text-accent">
                <span className="i-ri-rocket-2-line size-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="title-xl-semi-bold text-text-primary">
                  {t('versions.createRelease')}
                </DialogTitle>
                <DialogDescription className="mt-1 system-sm-regular text-text-tertiary">
                  {t('versions.createReleaseDescription')}
                </DialogDescription>
              </div>
            </div>

            <div className="flex flex-col gap-5 px-6 py-5">
              <div className="flex flex-col gap-2">
                <label className="system-xs-medium-uppercase text-text-tertiary" htmlFor="release-name">
                  {t('versions.releaseNameLabel')}
                </label>
                <Input
                  id="release-name"
                  value={releaseName}
                  onChange={e => setReleaseName(e.target.value)}
                  placeholder={t('versions.releaseNamePlaceholder')}
                  maxLength={128}
                  autoFocus
                  className="h-9"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="system-xs-medium-uppercase text-text-tertiary" htmlFor="release-description">
                    {t('versions.releaseDescriptionLabel')}
                  </label>
                  <span className="system-xs-regular text-text-quaternary">
                    {t('versions.optional')}
                  </span>
                </div>
                <Textarea
                  id="release-description"
                  value={releaseDescription}
                  onChange={e => setReleaseDescription(e.target.value)}
                  placeholder={t('versions.releaseDescriptionPlaceholder')}
                  maxLength={512}
                  className="min-h-[96px] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-divider-subtle bg-background-default-subtle px-6 py-4">
              <div className="system-xs-regular text-text-tertiary">
                {t('versions.createReleaseHint')}
              </div>
              <div className="flex shrink-0 justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={createRelease.isPending}
                  onClick={() => setIsCreating(false)}
                >
                  {t('versions.cancelCreate')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="min-w-[88px]"
                  disabled={!canSubmitRelease}
                >
                  {createRelease.isPending ? t('versions.creating') : t('versions.create')}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {releaseRows.length === 0
        ? (
            <div className="rounded-xl border border-dashed border-components-panel-border bg-components-panel-bg-blur px-4 py-12 text-center system-sm-regular text-text-tertiary">
              {canCreateRelease ? t('versions.emptyWithCreate') : t('versions.emptySourceUnavailable')}
            </div>
          )
        : (
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
                          <DeployReleaseMenu releaseId={release.id!} appInstanceId={appId} />
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
                        <DeployReleaseMenu releaseId={release.id!} appInstanceId={appId} />
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
