'use client'

import type { FC } from 'react'
import { Dialog, DialogCloseButton, DialogContent } from '@langgenius/dify-ui/dialog'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { consoleQuery } from '@/service/client'
import { useStartDeployment } from '../hooks/use-deployment-mutations'
import { deploymentReleaseHistoryQueryOptions } from '../queries'
import { useDeploymentsStore } from '../store'
import { environmentOptionsFromOptionsReply } from '../utils'
import { DeployForm } from './deploy-drawer/form'

const DeployDrawer: FC = () => {
  const { t } = useTranslation('deployments')
  const drawer = useDeploymentsStore(state => state.deployDrawer)
  const drawerAppInstanceId = drawer.appInstanceId
  const closeDeployDrawer = useDeploymentsStore(state => state.closeDeployDrawer)
  const startDeploy = useStartDeployment()
  const open = drawer.open
  const { data: releaseHistory } = useQuery({
    ...deploymentReleaseHistoryQueryOptions(drawerAppInstanceId),
    enabled: open && Boolean(drawerAppInstanceId),
  })
  const { data: environmentOptionsReply } = useQuery({
    ...consoleQuery.deployments.deploymentEnvironmentOptions.queryOptions(),
    enabled: open,
  })

  const environmentOptions = useMemo(
    () => environmentOptionsFromOptionsReply(environmentOptionsReply),
    [environmentOptionsReply],
  )
  const environments = environmentOptions
  const releases = releaseHistory?.data?.filter(release => release.id) ?? []
  const defaultReleaseId = releases[0]?.id
  const formKey = `${drawer.appInstanceId ?? 'none'}-${drawer.environmentId ?? 'any'}-${drawer.releaseId ?? 'new'}-${open ? '1' : '0'}`

  return (
    <Dialog
      open={open}
      onOpenChange={next => !next && closeDeployDrawer()}
    >
      <DialogContent className="w-[560px] max-w-[90vw]">
        <DialogCloseButton />
        {!drawerAppInstanceId
          ? <div className="p-4 text-text-tertiary">{t('deployDrawer.notFound')}</div>
          : (!releaseHistory || !environmentOptionsReply)
              ? (
                  <div className="flex items-center gap-2 p-4 system-sm-regular text-text-tertiary">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-components-panel-border border-t-transparent" />
                    {t('createModal.loadingApps')}
                  </div>
                )
              : (
                  <DeployForm
                    key={formKey}
                    appInstanceId={drawerAppInstanceId}
                    environments={environments}
                    releases={releases}
                    defaultReleaseId={defaultReleaseId}
                    lockedEnvId={drawer.environmentId}
                    presetReleaseId={drawer.releaseId}
                    onCancel={closeDeployDrawer}
                    onSubmit={({ environmentId, releaseId, releaseNote }) => {
                      closeDeployDrawer()
                      startDeploy.mutate({
                        appInstanceId: drawerAppInstanceId,
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
