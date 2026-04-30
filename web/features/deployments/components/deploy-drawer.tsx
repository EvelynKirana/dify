'use client'

import type { FC } from 'react'
import { Dialog, DialogCloseButton, DialogContent } from '@langgenius/dify-ui/dialog'
import { useTranslation } from 'react-i18next'
import { useDeploymentAppData } from '../hooks/use-deployment-data'
import { useStartDeployment } from '../hooks/use-deployment-mutations'
import { useSourceApps } from '../hooks/use-source-apps'
import { useDeploymentsStore } from '../store'
import { DeployForm } from './deploy-drawer/form'

const DeployDrawer: FC = () => {
  const { t } = useTranslation('deployments')
  const drawer = useDeploymentsStore(state => state.deployDrawer)
  const drawerAppId = drawer.appId
  const closeDeployDrawer = useDeploymentsStore(state => state.closeDeployDrawer)
  const startDeploy = useStartDeployment()
  const open = drawer.open
  const { environmentOptions } = useSourceApps({ enabled: open })
  const { data: appData } = useDeploymentAppData(drawerAppId, {
    enabled: open && Boolean(drawerAppId),
  })

  const environments = environmentOptions
  const releases = appData?.releaseHistory.data?.map(row => row.release ?? row).filter(release => release.id) ?? []
  const defaultReleaseId = releases[0]?.id
  const formKey = `${drawer.appId ?? 'none'}-${drawer.environmentId ?? 'any'}-${drawer.releaseId ?? 'new'}-${open ? '1' : '0'}`

  return (
    <Dialog
      open={open}
      onOpenChange={next => !next && closeDeployDrawer()}
    >
      <DialogContent className="w-[560px] max-w-[90vw]">
        <DialogCloseButton />
        {!drawerAppId
          ? <div className="p-4 text-text-tertiary">{t('deployDrawer.notFound')}</div>
          : !appData
              ? (
                  <div className="flex items-center gap-2 p-4 system-sm-regular text-text-tertiary">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-components-panel-border border-t-transparent" />
                    {t('createModal.loadingApps')}
                  </div>
                )
              : (
                  <DeployForm
                    key={formKey}
                    appId={drawerAppId}
                    environments={environments}
                    releases={releases}
                    defaultReleaseId={defaultReleaseId}
                    lockedEnvId={drawer.environmentId}
                    presetReleaseId={drawer.releaseId}
                    onCancel={closeDeployDrawer}
                    onSubmit={({ environmentId, releaseId, releaseNote }) => {
                      closeDeployDrawer()
                      startDeploy.mutate({
                        appId: drawerAppId,
                        environmentId,
                        releaseId,
                        releaseNote,
                      })
                    }}
                  />
                )}
      </DialogContent>
    </Dialog>
  )
}

export default DeployDrawer
