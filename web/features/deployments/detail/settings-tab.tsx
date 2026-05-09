'use client'
import type { AppInstanceBasicInfo, GetAppInstanceSettingsReply } from '@dify/contracts/enterprise/types.gen'
import {
  AlertDialog,
  AlertDialogActions,
  AlertDialogCancelButton,
  AlertDialogConfirmButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@langgenius/dify-ui/alert-dialog'
import { Button } from '@langgenius/dify-ui/button'
import { toast } from '@langgenius/dify-ui/toast'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@/next/navigation'
import { consoleQuery } from '@/service/client'
import { deployedRows } from '../utils'

type SettingsFormProps = {
  app: AppInstanceBasicInfo
  settings?: GetAppInstanceSettingsReply
}

type DeleteInstanceControlProps = {
  app: AppInstanceBasicInfo
  settings?: GetAppInstanceSettingsReply
  hasDeployments: boolean
}

function DeleteInstanceButton({
  app,
  settings,
  hasDeployments,
}: DeleteInstanceControlProps) {
  const { t } = useTranslation('deployments')
  const router = useRouter()
  const deleteInstance = useMutation(consoleQuery.enterprise.appDeploy.deleteAppInstance.mutationOptions())
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const appInstanceId = app.id
  const appName = app.name ?? appInstanceId ?? ''
  const canDelete = !hasDeployments && Boolean(settings) && settings?.deleteGuard?.canDelete !== false

  const handleDelete = () => {
    if (!appInstanceId)
      return

    void (async () => {
      setIsDeleting(true)
      try {
        await deleteInstance.mutateAsync({
          params: {
            appInstanceId,
          },
        })
        toast.success(t('settings.deleted'))
        router.push('/deployments')
      }
      catch {
        toast.error(t('settings.deleteFailed'))
      }
      finally {
        setIsDeleting(false)
        setShowDeleteConfirm(false)
      }
    })()
  }

  return (
    <>
      <Button
        variant="primary"
        tone="destructive"
        disabled={!canDelete || isDeleting}
        onClick={() => setShowDeleteConfirm(true)}
      >
        {t('settings.delete')}
      </Button>

      <AlertDialog open={showDeleteConfirm} onOpenChange={open => !open && setShowDeleteConfirm(false)}>
        <AlertDialogContent className="w-130">
          <div className="flex flex-col gap-3 px-6 pt-6 pb-2">
            <AlertDialogTitle className="title-2xl-semi-bold text-text-primary">
              {t('settings.deleteConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="system-md-regular text-text-tertiary">
              {t('settings.deleteConfirmDesc', { name: appName })}
            </AlertDialogDescription>
          </div>
          <AlertDialogActions>
            <AlertDialogCancelButton variant="secondary">
              {t('createModal.cancel')}
            </AlertDialogCancelButton>
            <AlertDialogConfirmButton onClick={handleDelete}>
              {t('settings.delete')}
            </AlertDialogConfirmButton>
          </AlertDialogActions>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function DeleteInstanceControl({
  app,
  settings,
  hasDeployments,
}: DeleteInstanceControlProps) {
  const { t } = useTranslation('deployments')

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-util-colors-red-red-200 bg-util-colors-red-red-50 p-4">
      <div className="system-sm-semibold text-util-colors-red-red-700">{t('settings.danger')}</div>
      <div className="system-xs-regular text-util-colors-red-red-600">
        {t('settings.dangerDesc')}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="system-xs-regular text-text-tertiary">
          {hasDeployments
            ? t('settings.undeployFirst')
            : settings?.deleteGuard?.disabledReason || t('settings.safeToDelete')}
        </div>
        <DeleteInstanceButton
          app={app}
          settings={settings}
          hasDeployments={hasDeployments}
        />
      </div>
    </div>
  )
}

function SettingsForm({ app, settings }: SettingsFormProps) {
  const { t } = useTranslation('deployments')
  const updateInstance = useMutation(consoleQuery.enterprise.appDeploy.updateAppInstance.mutationOptions())
  const appName = app.name ?? app.id ?? ''
  const [name, setName] = useState(settings?.name ?? appName)
  const [description, setDescription] = useState(settings?.description ?? app.description ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const initialName = settings?.name ?? appName
  const initialDescription = settings?.description ?? app.description ?? ''
  const canSave = Boolean(name.trim() && (name !== initialName || description !== initialDescription) && !isSaving)

  const handleSave = () => {
    const appInstanceId = app.id
    if (!canSave || !appInstanceId)
      return
    void (async () => {
      setIsSaving(true)
      try {
        await updateInstance.mutateAsync({
          params: {
            appInstanceId,
          },
          body: {
            name: name.trim(),
            description: description.trim() || undefined,
          },
        })
        toast.success(t('settings.updated'))
      }
      catch {
        toast.error(t('settings.updateFailed'))
      }
      finally {
        setIsSaving(false)
      }
    })()
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-components-panel-border bg-components-panel-bg p-4">
      <div className="system-sm-semibold text-text-primary">{t('settings.general')}</div>
      <div className="system-xs-regular text-text-tertiary">{t('settings.descriptionHelp')}</div>
      <div className="flex flex-col gap-2">
        <label className="system-xs-medium-uppercase text-text-tertiary" htmlFor="settings-name">
          {t('settings.name')}
        </label>
        <input
          id="settings-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex h-8 items-center rounded-lg border border-components-input-border-active bg-components-input-bg-normal px-3 system-sm-medium text-text-secondary outline-hidden placeholder:text-text-quaternary"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="system-xs-medium-uppercase text-text-tertiary" htmlFor="settings-desc">
          {t('settings.description')}
        </label>
        <textarea
          id="settings-desc"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="min-h-24 rounded-lg border border-components-input-border-active bg-components-input-bg-normal px-3 py-2 system-sm-regular text-text-secondary outline-hidden placeholder:text-text-quaternary"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          disabled={isSaving || (name === initialName && description === initialDescription)}
          onClick={() => {
            setName(initialName)
            setDescription(initialDescription)
          }}
        >
          {t('settings.reset')}
        </Button>
        <Button variant="primary" disabled={!canSave} onClick={handleSave}>
          {t('settings.save')}
        </Button>
      </div>
    </div>
  )
}

function SettingsFormSection({ appInstanceId }: {
  appInstanceId: string
}) {
  const appInput = { params: { appInstanceId } }
  const { data: overview } = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceOverview.queryOptions({
    input: appInput,
  }))
  const app = overview?.instance
  const settingsQuery = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceSettings.queryOptions({
    input: appInput,
  }))

  if (!app?.id)
    return null

  const appName = app.name ?? app.id
  const formKey = `${app.id}-${settingsQuery.data?.name ?? appName}-${settingsQuery.data?.description ?? app.description ?? ''}`

  return (
    <SettingsForm
      key={formKey}
      app={app}
      settings={settingsQuery.data}
    />
  )
}

function DeleteInstanceControlSection({ appInstanceId }: {
  appInstanceId: string
}) {
  const appInput = { params: { appInstanceId } }
  const { data: overview } = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceOverview.queryOptions({
    input: appInput,
  }))
  const { data: environmentDeployments } = useQuery(consoleQuery.enterprise.appDeploy.listRuntimeInstances.queryOptions({
    input: appInput,
  }))
  const settingsQuery = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceSettings.queryOptions({
    input: appInput,
  }))
  const app = overview?.instance

  if (!app?.id)
    return null

  const hasDeployments = deployedRows(environmentDeployments?.data).length > 0

  return (
    <DeleteInstanceControl
      app={app}
      settings={settingsQuery.data}
      hasDeployments={hasDeployments}
    />
  )
}

export function SettingsTab({ appInstanceId }: {
  appInstanceId: string
}) {
  return (
    <div className="flex max-w-160 flex-col gap-5 p-6">
      <SettingsFormSection appInstanceId={appInstanceId} />
      <DeleteInstanceControlSection appInstanceId={appInstanceId} />
    </div>
  )
}
