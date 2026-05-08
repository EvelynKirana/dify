'use client'
import type { App } from '@/types/app'
import { Button } from '@langgenius/dify-ui/button'
import { cn } from '@langgenius/dify-ui/cn'
import { Dialog, DialogCloseButton, DialogContent, DialogDescription, DialogTitle } from '@langgenius/dify-ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@langgenius/dify-ui/popover'
import { toast } from '@langgenius/dify-ui/toast'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAtomValue, useSetAtom } from 'jotai'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppTypeIcon } from '@/app/components/app/type-selector'
import AppIcon from '@/app/components/base/app-icon'
import Input from '@/app/components/base/input'
import { useRouter } from '@/next/navigation'
import { consoleQuery } from '@/service/client'
import { AppModeEnum } from '@/types/app'
import { closeCreateInstanceModalAtom, createInstanceModalOpenAtom } from '../store'

const MAX_STUDIO_SOURCE_APPS = 100

type StudioSourceApp = {
  id: string
  name: string
  mode: AppModeEnum
  iconType?: App['icon_type']
  icon?: string
  iconBackground?: string
  iconUrl?: string | null
  description?: string
}

function toStudioSourceAppInfo(app: App): StudioSourceApp {
  return {
    id: app.id,
    name: app.name,
    mode: app.mode || AppModeEnum.WORKFLOW,
    iconType: app.icon_type,
    icon: app.icon,
    iconBackground: app.icon_background ?? undefined,
    iconUrl: app.icon_url,
    description: app.description || undefined,
  }
}

type AppPickerProps = {
  apps: StudioSourceApp[]
  isLoading: boolean
  value: string
  onChange: (sourceAppId: string) => void
}

function AppPicker({ apps, isLoading, value, onChange }: AppPickerProps) {
  const { t } = useTranslation('deployments')
  const [open, setOpen] = useState(false)
  const [keywords, setKeywords] = useState('')

  const q = keywords.trim().toLowerCase()
  const filtered = q
    ? apps.filter(a => a.name.toLowerCase().includes(q) || a.mode.toLowerCase().includes(q))
    : apps

  const handleOpenChange = (next: boolean) => {
    if (!next)
      setKeywords('')
    setOpen(next)
  }

  if (isLoading) {
    return (
      <div
        className="flex h-10 w-full items-center justify-between rounded-lg border-[0.5px] border-components-input-border-active bg-components-input-bg-normal pr-2 pl-2 text-left"
        aria-busy="true"
      >
        <span className="truncate system-sm-regular text-text-quaternary">{t('createModal.loadingApps')}</span>
        <span aria-hidden className="h-4 w-4 shrink-0" />
      </div>
    )
  }

  const selected = apps.find(a => a.id === value)

  if (apps.length === 0) {
    return (
      <div className="flex h-10 w-full items-center rounded-lg border-[0.5px] border-components-input-border-active bg-components-input-bg-normal px-3 system-sm-regular text-text-tertiary">
        <span className="truncate">{t('createModal.noApps')}</span>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={(
          <button
            type="button"
            className={cn(
              'flex h-10 w-full items-center justify-between rounded-lg border-[0.5px] bg-components-input-bg-normal pr-2 pl-2 text-left transition-colors',
              open
                ? 'border-components-input-border-active'
                : 'border-components-input-border-active hover:border-components-input-border-hover',
            )}
          />
        )}
      >
        {selected
          ? (
              <div className="flex min-w-0 items-center gap-2">
                <div className="relative shrink-0">
                  <AppIcon
                    size="tiny"
                    iconType={selected.iconType}
                    icon={selected.icon}
                    background={selected.iconBackground}
                    imageUrl={selected.iconUrl}
                  />
                  <AppTypeIcon
                    type={selected.mode}
                    wrapperClassName="absolute -bottom-0.5 -right-0.5 w-3 h-3 shadow-sm"
                    className="h-2 w-2"
                  />
                </div>
                <span className="truncate system-sm-medium text-text-secondary">{selected.name}</span>
                <span className="shrink-0 system-2xs-medium-uppercase text-text-tertiary">{selected.mode}</span>
              </div>
            )
          : (
              <span className="system-sm-regular text-text-quaternary">
                {t('createModal.appPickerPlaceholder')}
              </span>
            )}
        <span
          aria-hidden
          className={cn('i-ri-arrow-down-s-line h-4 w-4 shrink-0 text-text-tertiary transition-transform', open && 'rotate-180')}
        />
      </PopoverTrigger>
      <PopoverContent
        placement="bottom-start"
        sideOffset={4}
        popupClassName="p-0 overflow-hidden"
        popupProps={{ style: { width: 'var(--anchor-width, auto)' } }}
      >
        <div className="flex flex-col">
          <div className="p-2">
            <Input
              showLeftIcon
              showClearIcon
              placeholder={t('createModal.appSearchPlaceholder')}
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              onClear={() => setKeywords('')}
              autoFocus
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto px-1 pb-1">
            {filtered.length === 0
              ? (
                  <div className="px-3 py-6 text-center system-sm-regular text-text-tertiary">
                    {t('createModal.appSearchEmpty')}
                  </div>
                )
              : filtered.map((app) => {
                  const isSelected = app.id === value
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => {
                        onChange(app.id)
                        setOpen(false)
                        setKeywords('')
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                        'hover:bg-state-base-hover',
                        isSelected && 'bg-state-base-hover',
                      )}
                    >
                      <div className="relative shrink-0">
                        <AppIcon
                          size="tiny"
                          iconType={app.iconType}
                          icon={app.icon}
                          background={app.iconBackground}
                          imageUrl={app.iconUrl}
                        />
                        <AppTypeIcon
                          type={app.mode}
                          wrapperClassName="absolute -bottom-0.5 -right-0.5 w-3 h-3 shadow-sm"
                          className="h-2 w-2"
                        />
                      </div>
                      <span className="min-w-0 grow truncate system-sm-medium text-text-secondary">
                        {app.name}
                      </span>
                      <span className="shrink-0 system-2xs-medium-uppercase text-text-tertiary">
                        {app.mode}
                      </span>
                      {isSelected && (
                        <span aria-hidden className="i-ri-check-line h-4 w-4 shrink-0 text-text-accent" />
                      )}
                    </button>
                  )
                })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function CreateInstanceForm() {
  const { t } = useTranslation('deployments')
  const router = useRouter()
  const closeModal = useSetAtom(closeCreateInstanceModalAtom)
  const createInstance = useMutation(consoleQuery.enterprise.appDeploy.createAppInstance.mutationOptions())
  const { data: appList, isLoading } = useQuery(consoleQuery.apps.list.queryOptions({
    input: {
      query: {
        page: 1,
        limit: MAX_STUDIO_SOURCE_APPS,
        name: '',
      },
    },
  }))
  const apps = (appList?.data ?? []).map(toStudioSourceAppInfo)

  const [sourceAppId, setSourceAppId] = useState<string>('')

  const selectedApp = apps.find(a => a.id === sourceAppId)
  const canCreate = Boolean(sourceAppId && !createInstance.isPending)

  const handleCreate = async (form: HTMLFormElement) => {
    if (!canCreate)
      return

    const formData = new FormData(form)
    const name = String(formData.get('name') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    if (!name)
      return

    try {
      const result = await createInstance.mutateAsync({
        body: {
          sourceAppId,
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
        <AppPicker
          apps={apps}
          isLoading={isLoading}
          value={sourceAppId}
          onChange={setSourceAppId}
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
          placeholder={selectedApp?.name ?? t('createModal.namePlaceholder')}
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
