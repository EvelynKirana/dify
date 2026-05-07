'use client'
import {
  AlertDialog,
  AlertDialogActions,
  AlertDialogCancelButton,
  AlertDialogConfirmButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@langgenius/dify-ui/alert-dialog'
import { skipToken, useMutation, useQuery } from '@tanstack/react-query'
import { useAtomValue, useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { consoleQuery } from '@/service/client'
import { DEPLOYMENT_PAGE_SIZE } from '../data'
import {
  closeRollbackModalAtom,
  rollbackModalAppInstanceIdAtom,
  rollbackModalEnvironmentIdAtom,
  rollbackModalOpenAtom,
  rollbackModalTargetReleaseIdAtom,
} from '../store'
import {
  activeRelease,
  deployedRows,
  environmentId,
  environmentName,
  environmentOptionsFromOptionsReply,
  releaseCommit,
  releaseLabel,
} from '../utils'

function InfoRow({ label, value }: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="system-xs-medium-uppercase text-text-tertiary">{label}</span>
      <span className="system-sm-medium text-text-primary">{value}</span>
    </div>
  )
}

export function RollbackModal() {
  const { t } = useTranslation('deployments')
  const open = useAtomValue(rollbackModalOpenAtom)
  const appInstanceId = useAtomValue(rollbackModalAppInstanceIdAtom)
  const modalEnvironmentId = useAtomValue(rollbackModalEnvironmentIdAtom)
  const targetReleaseId = useAtomValue(rollbackModalTargetReleaseIdAtom)
  const closeRollbackModal = useSetAtom(closeRollbackModalAtom)
  const rollbackDeployment = useMutation(consoleQuery.enterprise.appDeploy.createDeployment.mutationOptions())
  const appInput = appInstanceId
    ? { params: { appInstanceId } }
    : skipToken
  const { data: overview } = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceOverview.queryOptions({
    input: appInput,
    enabled: open && Boolean(appInstanceId),
  }))
  const { data: environmentDeployments } = useQuery(consoleQuery.enterprise.appDeploy.listRuntimeInstances.queryOptions({
    input: appInput,
    enabled: open && Boolean(appInstanceId),
  }))
  const { data: environmentOptionsReply } = useQuery(consoleQuery.enterprise.appDeploy.listDeploymentEnvironmentOptions.queryOptions({
    enabled: open,
  }))
  const { data: releaseHistory } = useQuery(consoleQuery.enterprise.appDeploy.listReleases.queryOptions({
    input: appInstanceId
      ? {
          params: { appInstanceId },
          query: {
            pageNumber: 1,
            resultsPerPage: DEPLOYMENT_PAGE_SIZE,
          },
        }
      : skipToken,
    enabled: open && Boolean(appInstanceId),
  }))
  const environmentOptions = environmentOptionsFromOptionsReply(environmentOptionsReply)

  const currentRow = deployedRows(environmentDeployments?.data)
    .find(row => environmentId(row.environment) === modalEnvironmentId)
  const targetRelease = [
    ...(releaseHistory?.data?.filter(release => !!release.id) ?? []),
  ].find(release => release.id === targetReleaseId)
  const currentRelease = activeRelease(currentRow)
  const environment = currentRow?.environment
    ?? environmentOptions.find(env => env.id === modalEnvironmentId)
  const app = overview?.instance
  const appName = app?.name ?? '-'
  const sourceAppName = app?.sourceAppName ?? appName

  const confirm = () => {
    if (!appInstanceId || !modalEnvironmentId || !targetReleaseId)
      return
    closeRollbackModal()
    rollbackDeployment.mutate({
      params: {
        appInstanceId,
      },
      body: {
        environmentId: modalEnvironmentId,
        releaseId: targetReleaseId,
        bindings: [],
      },
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={next => !next && closeRollbackModal()}
    >
      <AlertDialogContent className="w-[520px]">
        <div className="flex flex-col gap-3 px-6 pt-6 pb-2">
          <AlertDialogTitle className="title-2xl-semi-bold text-text-primary">
            {t('rollback.title', { release: releaseLabel(targetRelease) })}
          </AlertDialogTitle>
          <AlertDialogDescription className="system-md-regular text-text-tertiary">
            {t('rollback.description')}
          </AlertDialogDescription>

          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-components-panel-border bg-components-panel-bg-blur p-3">
            <InfoRow label={t('rollback.instance')} value={appName} />
            <InfoRow label={t('rollback.sourceApp')} value={sourceAppName} />
            <InfoRow label={t('rollback.environment')} value={environmentName(environment)} />
            <InfoRow
              label={t('rollback.currentRelease')}
              value={currentRelease ? `${releaseLabel(currentRelease)} / ${releaseCommit(currentRelease)}` : '-'}
            />
            <InfoRow
              label={t('rollback.rollbackTo')}
              value={targetRelease ? `${releaseLabel(targetRelease)} / ${releaseCommit(targetRelease)}` : '-'}
            />
          </div>

          <div className="rounded-lg border border-dashed border-util-colors-red-red-200 bg-util-colors-red-red-50 p-3">
            <div className="title-sm-semi-bold text-util-colors-red-red-700">
              {t('rollback.impactingTitle')}
            </div>
            <p className="mt-1 system-xs-regular text-util-colors-red-red-600">
              {t('rollback.impactingBody')}
            </p>
          </div>
        </div>
        <AlertDialogActions>
          <AlertDialogCancelButton variant="secondary">
            {t('rollback.cancel')}
          </AlertDialogCancelButton>
          <AlertDialogConfirmButton onClick={confirm}>
            {t('rollback.confirm')}
          </AlertDialogConfirmButton>
        </AlertDialogActions>
      </AlertDialogContent>
    </AlertDialog>
  )
}
