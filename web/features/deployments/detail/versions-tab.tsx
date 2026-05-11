'use client'
import { Button } from '@langgenius/dify-ui/button'
import { Dialog, DialogCloseButton, DialogContent, DialogDescription, DialogTitle } from '@langgenius/dify-ui/dialog'
import { toast } from '@langgenius/dify-ui/toast'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '@/app/components/base/input'
import { consoleQuery } from '@/service/client'
import { ReleaseHistoryTable } from './versions-tab/release-history-table'

function CreateReleaseControl({ appInstanceId }: {
  appInstanceId: string
}) {
  const { t } = useTranslation('deployments')
  const createRelease = useMutation(consoleQuery.enterprise.appDeploy.createRelease.mutationOptions())
  const [isCreating, setIsCreating] = useState(false)
  const { data: overview } = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceOverview.queryOptions({
    input: {
      params: { appInstanceId },
    },
  }))
  const canCreateRelease = overview ? overview.instance?.canCreateRelease ?? true : false

  async function handleCreateRelease(form: HTMLFormElement) {
    if (!canCreateRelease || createRelease.isPending)
      return

    const formData = new FormData(form)
    const releaseName = String(formData.get('name') ?? '').trim()
    const releaseDescription = String(formData.get('description') ?? '').trim()
    if (!releaseName)
      return

    try {
      const response = await createRelease.mutateAsync({
        params: {
          appInstanceId,
        },
        body: {
          name: releaseName,
          description: releaseDescription || undefined,
        },
      })
      if (!response.release?.id)
        throw new Error('Create release did not return a release.')
      form.reset()
      setIsCreating(false)
    }
    catch {
      toast.error(t('versions.createFailed'))
    }
  }

  return (
    <>
      <Button
        size="small"
        variant="primary"
        disabled={!canCreateRelease}
        onClick={() => setIsCreating(true)}
      >
        <span className="i-ri-add-line size-3.5" />
        {t('versions.createRelease')}
      </Button>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="w-140 overflow-hidden p-0">
          <DialogCloseButton />
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void handleCreateRelease(event.currentTarget)
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
                  name="name"
                  placeholder={t('versions.releaseNamePlaceholder')}
                  maxLength={128}
                  required
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
                <textarea
                  id="release-description"
                  name="description"
                  placeholder={t('versions.releaseDescriptionPlaceholder')}
                  maxLength={512}
                  className="min-h-24 w-full resize-none appearance-none rounded-md border border-transparent bg-components-input-bg-normal p-2 system-sm-regular text-components-input-text-filled caret-primary-600 outline-hidden placeholder:text-components-input-text-placeholder hover:border-components-input-border-hover hover:bg-components-input-bg-hover focus:border-components-input-border-active focus:bg-components-input-bg-active focus:shadow-xs"
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
                  className="min-w-22"
                  disabled={!canCreateRelease || createRelease.isPending}
                >
                  {createRelease.isPending ? t('versions.creating') : t('versions.create')}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SourceAppUnavailableNotice({ appInstanceId }: {
  appInstanceId: string
}) {
  const { t } = useTranslation('deployments')
  const { data: overview } = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceOverview.queryOptions({
    input: {
      params: { appInstanceId },
    },
  }))
  if (overview?.instance?.canCreateRelease !== false)
    return null

  return (
    <div className="rounded-lg border border-divider-subtle bg-background-default-subtle px-3 py-2 system-sm-regular text-text-tertiary">
      {t('versions.sourceAppUnavailable')}
    </div>
  )
}

export function VersionsTab({ appInstanceId }: {
  appInstanceId: string
}) {
  const { t } = useTranslation('deployments')

  return (
    <div className="flex w-full max-w-240 flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="system-sm-semibold text-text-primary">
          {t('versions.releaseHistory')}
        </div>
        <CreateReleaseControl appInstanceId={appInstanceId} />
      </div>

      <SourceAppUnavailableNotice appInstanceId={appInstanceId} />

      <ReleaseHistoryTable appInstanceId={appInstanceId} />
    </div>
  )
}
