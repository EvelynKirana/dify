'use client'
import type { FC } from 'react'
import {
  AlertDialog,
  AlertDialogActions,
  AlertDialogCancelButton,
  AlertDialogConfirmButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@langgenius/dify-ui/alert-dialog'
import { useTranslation } from 'react-i18next'
import { useSourceApps } from '../hooks/use-source-apps'
import { useDeploymentAppData, useDeploymentInstance, useDeploymentsStore } from '../store'
import {
  activeRelease,
  deployedRows,
  environmentId,
  environmentName,
  releaseCommit,
  releaseLabel,
} from '../utils'

const InfoRow: FC<{ label: string, value: string }> = ({ label, value }) => {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="system-xs-medium-uppercase text-text-tertiary">{label}</span>
      <span className="system-sm-medium text-text-primary">{value}</span>
    </div>
  )
}

const RollbackModal: FC = () => {
  const { t } = useTranslation('deployments')
  const modal = useDeploymentsStore(state => state.rollbackModal)
  const appData = useDeploymentAppData(modal.appId)
  const storedApp = useDeploymentInstance(modal.appId)
  const closeRollbackModal = useDeploymentsStore(state => state.closeRollbackModal)
  const rollbackDeployment = useDeploymentsStore(state => state.rollbackDeployment)
  const { appMap, environmentOptions } = useSourceApps()

  const currentRow = deployedRows(appData?.environmentDeployments.data)
    .find(row => environmentId(row.environment) === modal.environmentId)
  const targetRelease = [
    ...(appData?.releaseHistory.data?.map(row => row.release ?? row).filter(release => !!release?.id) ?? []),
  ].find(release => release?.id === modal.targetReleaseId)
  const currentRelease = activeRelease(currentRow)
  const environment = currentRow?.environment
    ?? environmentOptions.find(env => env.id === modal.environmentId)
  const app = storedApp ?? (modal.appId ? appMap.get(modal.appId) : undefined)

  const confirm = () => {
    if (!modal.appId || !modal.environmentId || !modal.targetReleaseId)
      return
    rollbackDeployment(modal.appId, modal.environmentId, modal.targetReleaseId)
  }

  return (
    <AlertDialog
      open={modal.open}
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
            <InfoRow label={t('rollback.instance')} value={app?.name ?? '-'} />
            <InfoRow label={t('rollback.sourceApp')} value={app?.name ?? '-'} />
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

export default RollbackModal
