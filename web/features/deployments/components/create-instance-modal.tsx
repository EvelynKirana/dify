'use client'
import type { App } from '@/types/app'
import { Button } from '@langgenius/dify-ui/button'
import { Dialog, DialogCloseButton, DialogContent, DialogDescription, DialogTitle } from '@langgenius/dify-ui/dialog'
import { toast } from '@langgenius/dify-ui/toast'
import { keepPreviousData, useInfiniteQuery, useMutation } from '@tanstack/react-query'
import { useAtomValue, useSetAtom } from 'jotai'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppPicker } from '@/app/components/plugins/plugin-detail-panel/app-selector/app-picker'
import { AppTrigger } from '@/app/components/plugins/plugin-detail-panel/app-selector/app-trigger'
import { useRouter } from '@/next/navigation'
import { consoleQuery } from '@/service/client'
import { closeCreateInstanceModalAtom, createInstanceModalOpenAtom } from '../store'

const SOURCE_APP_PAGE_SIZE = 20

function SourceAppPicker({ value, onChange }: {
  value?: App
  onChange: (app: App) => void
}) {
  const [isShow, setIsShow] = useState(false)
  const [searchText, setSearchText] = useState('')

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    ...consoleQuery.apps.list.infiniteOptions({
      input: pageParam => ({
        query: {
          page: Number(pageParam),
          limit: SOURCE_APP_PAGE_SIZE,
          name: searchText,
        },
      }),
      getNextPageParam: lastPage => lastPage.has_more ? lastPage.page + 1 : undefined,
      initialPageParam: 1,
      placeholderData: keepPreviousData,
    }),
  })

  const apps = data?.pages.flatMap(page => page.data) ?? []

  return (
    <AppPicker
      disabled={false}
      trigger={<AppTrigger open={isShow} appDetail={value} />}
      isShow={isShow}
      onShowChange={setIsShow}
      onSelect={onChange}
      apps={apps}
      isLoading={isLoading || isFetchingNextPage}
      hasMore={hasNextPage ?? true}
      onLoadMore={() => {
        void fetchNextPage()
      }}
      searchText={searchText}
      onSearchChange={setSearchText}
      placement="bottom-start"
      offset={4}
    />
  )
}

function CreateInstanceForm() {
  const { t } = useTranslation('deployments')
  const router = useRouter()
  const closeModal = useSetAtom(closeCreateInstanceModalAtom)
  const createInstance = useMutation(consoleQuery.enterprise.appDeploy.createAppInstance.mutationOptions())

  const [sourceApp, setSourceApp] = useState<App>()

  const canCreate = Boolean(sourceApp?.id && !createInstance.isPending)

  const handleCreate = async (form: HTMLFormElement) => {
    if (!canCreate || !sourceApp?.id)
      return

    const formData = new FormData(form)
    const name = String(formData.get('name') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    if (!name)
      return

    try {
      const result = await createInstance.mutateAsync({
        body: {
          sourceAppId: sourceApp.id,
          name: name.trim(),
          description: description.trim() || undefined,
        },
      })
      if (!result.appInstanceId)
        throw new Error('Create app instance did not return an appInstanceId.')
      closeModal()
      router.push(`/deployments/${result.appInstanceId}/overview`)
    }
    catch {
      toast.error(t('createModal.createFailed'))
    }
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        void handleCreate(event.currentTarget)
      }}
    >
      <div>
        <DialogTitle className="title-xl-semi-bold text-text-primary">
          {t('createModal.title')}
        </DialogTitle>
        <DialogDescription className="mt-1 system-sm-regular text-text-tertiary">
          {t('createModal.description')}
        </DialogDescription>
      </div>

      <div className="flex flex-col gap-2">
        <label className="system-xs-medium-uppercase text-text-tertiary">{t('createModal.sourceApp')}</label>
        <SourceAppPicker
          value={sourceApp}
          onChange={setSourceApp}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="system-xs-medium-uppercase text-text-tertiary" htmlFor="instance-name">
          {t('createModal.nameLabel')}
        </label>
        <input
          id="instance-name"
          name="name"
          type="text"
          placeholder={sourceApp?.name ?? t('createModal.namePlaceholder')}
          required
          className="flex h-8 items-center rounded-lg border-[0.5px] border-components-input-border-active bg-components-input-bg-normal px-3 text-[13px] font-medium text-text-secondary outline-hidden placeholder:text-text-quaternary"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="system-xs-medium-uppercase text-text-tertiary" htmlFor="instance-desc">
          {t('createModal.descriptionLabel')}
        </label>
        <textarea
          id="instance-desc"
          name="description"
          placeholder={t('createModal.descriptionPlaceholder')}
          className="min-h-[80px] rounded-lg border-[0.5px] border-components-input-border-active bg-components-input-bg-normal px-3 py-2 text-[13px] text-text-secondary outline-hidden placeholder:text-text-quaternary"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={closeModal}>
          {t('createModal.cancel')}
        </Button>
        <Button type="submit" variant="primary" disabled={!canCreate}>
          {t('createModal.create')}
        </Button>
      </div>
    </form>
  )
}

export function CreateInstanceModal() {
  const open = useAtomValue(createInstanceModalOpenAtom)
  const closeModal = useSetAtom(closeCreateInstanceModalAtom)

  return (
    <Dialog
      open={open}
      onOpenChange={next => !next && closeModal()}
    >
      <DialogContent className="w-[520px] max-w-[90vw]">
        <DialogCloseButton />
        {open && <CreateInstanceForm />}
      </DialogContent>
    </Dialog>
  )
}
