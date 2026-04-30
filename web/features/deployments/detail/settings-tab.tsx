'use client'
import type { FC } from 'react'
import type { AppInfo } from '../types'
import type { GetAppInstanceSettingsReply } from '@/features/deployments/types'
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
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@/next/navigation'
import { consoleQuery } from '@/service/client'
import {
  useDeleteDeploymentInstance,
  useUpdateDeploymentInstance,
} from '../hooks/use-deployment-mutations'
import {
  deploymentEnvironmentDeploymentsQueryOptions,
  deploymentOverviewQueryOptions,
} from '../queries'
import {
  deployedRows,
  toAppInfoFromOverview,
} from '../utils'

type SettingsTabProps = {
  instanceId: string
}

type SettingsFormProps = {
  app: AppInfo
  settings?: GetAppInstanceSettingsReply
  hasDeployments: boolean
  onSave: (patch: Pick<AppInfo, 'name' | 'description'>) => Promise<void>
  onDelete: () => Promise<void>
}

const SettingsForm: FC<SettingsFormProps> = ({ app, settings, hasDeployments, onSave, onDelete }) => {
  const { t } = useTranslation('deployments')
  const [name, setName] = useState(settings?.name ?? app.name)
  const [description, setDescription] = useState(settings?.description ?? app.description ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const initialName = settings?.name ?? app.name
  const initialDescription = settings?.description ?? app.description ?? ''
  const canSave = Boolean(name.trim() && (name !== initialName || description !== initialDescription) && !isSaving)
  const canDelete = !hasDeployments && Boolean(settings) && settings?.deleteGuard?.canDelete !== false

  const handleSave = () => {
    if (!canSave)
      return
    void (async () => {
      setIsSaving(true)
      try {
        await onSave({
          name: name.trim(),
          description: description.trim() || undefined,
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

  const handleDelete = () => {
    void (async () => {
      setIsDeleting(true)
      try {
        await onDelete()
        toast.success(t('settings.deleted'))
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
    <div className="flex max-w-[640px] flex-col gap-5 p-6">
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
            className="flex h-8 items-center rounded-lg border-[0.5px] border-components-input-border-active bg-components-input-bg-normal px-3 text-[13px] font-medium text-text-secondary outline-hidden placeholder:text-text-quaternary"
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
            className="min-h-[96px] rounded-lg border-[0.5px] border-components-input-border-active bg-components-input-bg-normal px-3 py-2 text-[13px] text-text-secondary outline-hidden placeholder:text-text-quaternary"
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
          <Button
            variant="primary"
            tone="destructive"
            disabled={!canDelete || isDeleting}
            onClick={() => setShowDeleteConfirm(true)}
          >
            {t('settings.delete')}
          </Button>
        </div>
      </div>
      <AlertDialog open={showDeleteConfirm} onOpenChange={open => !open && setShowDeleteConfirm(false)}>
        <AlertDialogContent className="w-[520px]">
          <div className="flex flex-col gap-3 px-6 pt-6 pb-2">
            <AlertDialogTitle className="title-2xl-semi-bold text-text-primary">
              {t('settings.deleteConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="system-md-regular text-text-tertiary">
              {t('settings.deleteConfirmDesc', { name: app.name })}
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
    </div>
  )
}

const SettingsTab: FC<SettingsTabProps> = ({ instanceId }) => {
  const router = useRouter()
  const updateInstance = useUpdateDeploymentInstance()
  const deleteInstance = useDeleteDeploymentInstance()
  const appInput = { params: { appInstanceId: instanceId } }
  const { data: overview } = useQuery(deploymentOverviewQueryOptions(instanceId))
  const { data: environmentDeployments } = useQuery(deploymentEnvironmentDeploymentsQueryOptions(instanceId))
  const app = useMemo(
    () => toAppInfoFromOverview(overview?.instance),
    [overview?.instance],
  )
  const settingsQuery = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceSettings.queryOptions({
    input: appInput,
  }))

  if (!app)
    return null

  const hasDeployments = deployedRows(environmentDeployments?.data).length > 0
  const formKey = `${app.id}-${settingsQuery.data?.name ?? app.name}-${settingsQuery.data?.description ?? app.description ?? ''}`

  return (
    <SettingsForm
      key={formKey}
      app={app}
      settings={settingsQuery.data}
      hasDeployments={hasDeployments}
      onSave={async (patch) => {
        await updateInstance.mutateAsync({
          params: {
            appInstanceId: instanceId,
          },
          body: patch,
        })
      }}
      onDelete={async () => {
        await deleteInstance.mutateAsync({
          params: {
            appInstanceId: instanceId,
          },
        })
        router.push('/deployments')
      }}
    />
  )
}

export default SettingsTab
