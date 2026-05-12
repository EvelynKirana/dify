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
import Input from '@/app/components/base/input'
import { SkeletonRectangle, SkeletonRow } from '@/app/components/base/skeleton'
import Textarea from '@/app/components/base/textarea'
import { useRouter } from '@/next/navigation'
import { consoleQuery } from '@/service/client'
import { isUndeployedDeploymentRow } from '../runtime-status'
import { Section, SectionState } from './common'
import { AccessChannelsSection } from './settings-tab/access/channels-section'
import { DeveloperApiSection } from './settings-tab/access/developer-api-section'
import { AccessPermissionsSection } from './settings-tab/access/permissions-section'

type AppInstanceWithId = AppInstanceBasicInfo & { id: string }

const SETTINGS_FORM_SKELETON_FIELDS = [
  { key: 'name', inputClassName: 'my-0 h-8 w-full animate-pulse rounded-lg' },
  { key: 'description', inputClassName: 'my-0 h-24 w-full animate-pulse rounded-lg' },
]

function SettingsFormSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {SETTINGS_FORM_SKELETON_FIELDS.map(field => (
        <div key={field.key} className="flex flex-col gap-2">
          <SkeletonRectangle className="h-3 w-24 animate-pulse" />
          <SkeletonRectangle className={field.inputClassName} />
        </div>
      ))}
      <SkeletonRow className="justify-end gap-2">
        <SkeletonRectangle className="my-0 h-8 w-18 animate-pulse rounded-lg" />
        <SkeletonRectangle className="my-0 h-8 w-16 animate-pulse rounded-lg" />
      </SkeletonRow>
    </div>
  )
}

function DeleteInstanceSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-util-colors-red-red-200 bg-util-colors-red-red-50 p-4">
      <SkeletonRectangle className="h-3.5 w-20 animate-pulse" />
      <SkeletonRectangle className="h-3 w-3/5 animate-pulse" />
      <SkeletonRow className="items-center justify-between gap-2">
        <SkeletonRectangle className="h-3 w-48 animate-pulse" />
        <SkeletonRectangle className="my-0 h-8 w-18 animate-pulse rounded-lg" />
      </SkeletonRow>
    </div>
  )
}

type DeleteInstanceControlProps = {
  app: AppInstanceWithId
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const appInstanceId = app.id
  const appName = app.name ?? appInstanceId
  const canDelete = !hasDeployments && Boolean(settings) && settings?.deleteGuard?.canDelete !== false

  const handleDelete = () => {
    deleteInstance.mutate(
      {
        params: {
          appInstanceId,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('settings.deleted'))
          router.push('/deployments')
        },
        onError: () => {
          toast.error(t('settings.deleteFailed'))
        },
        onSettled: () => {
          setShowDeleteConfirm(false)
        },
      },
    )
  }

  return (
    <>
      <Button
        variant="primary"
        tone="destructive"
        disabled={!canDelete || deleteInstance.isPending}
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

function SettingsForm({ app, settings }: {
  app: AppInstanceWithId
  settings?: GetAppInstanceSettingsReply
}) {
  const { t } = useTranslation('deployments')
  const updateInstance = useMutation(consoleQuery.enterprise.appDeploy.updateAppInstance.mutationOptions())
  const appName = app.name ?? app.id
  const [name, setName] = useState(settings?.name ?? appName)
  const [description, setDescription] = useState(settings?.description ?? app.description ?? '')
  const initialName = settings?.name ?? appName
  const initialDescription = settings?.description ?? app.description ?? ''
  const canSave = Boolean(name.trim() && (name !== initialName || description !== initialDescription) && !updateInstance.isPending)

  const handleSave = () => {
    const appInstanceId = app.id
    if (!canSave)
      return
    updateInstance.mutate(
      {
        params: {
          appInstanceId,
        },
        body: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('settings.updated'))
        },
        onError: () => {
          toast.error(t('settings.updateFailed'))
        },
      },
    )
  }

  return (
    <Section title={t('settings.general')} description={t('settings.descriptionHelp')}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label className="system-xs-medium-uppercase text-text-tertiary" htmlFor="settings-name">
            {t('settings.name')}
          </label>
          <Input
            id="settings-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="system-xs-medium-uppercase text-text-tertiary" htmlFor="settings-desc">
            {t('settings.description')}
          </label>
          <Textarea
            id="settings-desc"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="min-h-24"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={updateInstance.isPending || (name === initialName && description === initialDescription)}
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
    </Section>
  )
}

function SettingsFormSection({ appInstanceId }: {
  appInstanceId: string
}) {
  const { t } = useTranslation('deployments')
  const appInput = { params: { appInstanceId } }
  const overviewQuery = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceOverview.queryOptions({
    input: appInput,
  }))
  const overview = overviewQuery.data
  const app = overview?.instance
  const settingsQuery = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceSettings.queryOptions({
    input: appInput,
  }))

  if (overviewQuery.isLoading || settingsQuery.isLoading) {
    return (
      <Section title={t('settings.general')} description={t('settings.descriptionHelp')}>
        <SettingsFormSkeleton />
      </Section>
    )
  }

  if (overviewQuery.isError || settingsQuery.isError) {
    return (
      <Section title={t('settings.general')} description={t('settings.descriptionHelp')}>
        <SectionState>{t('common.loadFailed')}</SectionState>
      </Section>
    )
  }

  if (!app?.id) {
    return (
      <Section title={t('settings.general')} description={t('settings.descriptionHelp')}>
        <SectionState>{t('detail.notFound')}</SectionState>
      </Section>
    )
  }

  const appName = app.name ?? app.id
  const formKey = `${app.id}-${settingsQuery.data?.name ?? appName}-${settingsQuery.data?.description ?? app.description ?? ''}`
  const appWithId = {
    ...app,
    id: app.id,
  }

  return (
    <SettingsForm
      key={formKey}
      app={appWithId}
      settings={settingsQuery.data}
    />
  )
}

function DeleteInstanceControlSection({ appInstanceId }: {
  appInstanceId: string
}) {
  const { t } = useTranslation('deployments')
  const appInput = { params: { appInstanceId } }
  const overviewQuery = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceOverview.queryOptions({
    input: appInput,
  }))
  const overview = overviewQuery.data
  const environmentDeploymentsQuery = useQuery(consoleQuery.enterprise.appDeploy.listRuntimeInstances.queryOptions({
    input: appInput,
  }))
  const settingsQuery = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceSettings.queryOptions({
    input: appInput,
  }))
  const environmentDeployments = environmentDeploymentsQuery.data
  const app = overview?.instance

  if (overviewQuery.isLoading || environmentDeploymentsQuery.isLoading || settingsQuery.isLoading) {
    return <DeleteInstanceSkeleton />
  }

  if (overviewQuery.isError || environmentDeploymentsQuery.isError || settingsQuery.isError) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-util-colors-red-red-200 bg-util-colors-red-red-50 p-4">
        <div className="system-sm-semibold text-util-colors-red-red-700">{t('settings.danger')}</div>
        <SectionState>{t('common.loadFailed')}</SectionState>
      </div>
    )
  }

  if (!app?.id) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-util-colors-red-red-200 bg-util-colors-red-red-50 p-4">
        <div className="system-sm-semibold text-util-colors-red-red-700">{t('settings.danger')}</div>
        <SectionState>{t('detail.notFound')}</SectionState>
      </div>
    )
  }

  const hasDeployments = environmentDeployments?.data?.some(row => Boolean(row.environment?.id) && !isUndeployedDeploymentRow(row)) ?? false
  const appWithId = {
    ...app,
    id: app.id,
  }

  return (
    <DeleteInstanceControl
      app={appWithId}
      settings={settingsQuery.data}
      hasDeployments={hasDeployments}
    />
  )
}

export function SettingsTab({ appInstanceId }: {
  appInstanceId: string
}) {
  return (
    <div className="flex w-full max-w-240 flex-col gap-5 p-6">
      <AccessPermissionsSection appInstanceId={appInstanceId} />
      <AccessChannelsSection appInstanceId={appInstanceId} />
      <DeveloperApiSection appInstanceId={appInstanceId} />
      <SettingsFormSection appInstanceId={appInstanceId} />
      <DeleteInstanceControlSection appInstanceId={appInstanceId} />
    </div>
  )
}
