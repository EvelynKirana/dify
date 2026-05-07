'use client'

import { Dialog, DialogCloseButton, DialogContent } from '@langgenius/dify-ui/dialog'
import { toast } from '@langgenius/dify-ui/toast'
import { skipToken, useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { consoleQuery } from '@/service/client'
import { DEPLOYMENT_PAGE_SIZE } from '../data'
import { useDeploymentsStore } from '../store'
import { environmentOptionsFromOptionsReply } from '../utils'
import { DeployForm } from './deploy-drawer/form'

export function DeployDrawer() {
  const { t } = useTranslation('deployments')
  const drawer = useDeploymentsStore(state => state.deployDrawer)
  const drawerAppInstanceId = drawer.appInstanceId
  const closeDeployDrawer = useDeploymentsStore(state => state.closeDeployDrawer)
  const startDeploy = useMutation(consoleQuery.enterprise.appDeploy.createDeployment.mutationOptions())
  const open = drawer.open
  const { data: releaseHistory } = useQuery(consoleQuery.enterprise.appDeploy.listReleases.queryOptions({
    input: drawerAppInstanceId
      ? {
          params: { appInstanceId: drawerAppInstanceId },
          query: {
            pageNumber: 1,
            resultsPerPage: DEPLOYMENT_PAGE_SIZE,
          },
        }
      : skipToken,
    enabled: open && Boolean(drawerAppInstanceId),
  }))
  const { data: environmentOptionsReply } = useQuery(consoleQuery.enterprise.appDeploy.listDeploymentEnvironmentOptions.queryOptions({
    enabled: open,
  }))

  const environments = environmentOptionsFromOptionsReply(environmentOptionsReply)
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
                    isSubmitting={startDeploy.isPending}
                    onCancel={closeDeployDrawer}
                    onSubmit={async ({ environmentId, releaseId, bindings }) => {
                      try {
                        await startDeploy.mutateAsync({
                          params: {
                            appInstanceId: drawerAppInstanceId,
                          },
                          body: {
                            environmentId,
                            releaseId,
                            bindings,
                          },
                        })
                        closeDeployDrawer()
                      }
                      catch {
                        toast.error(t('deployDrawer.deployFailed'))
                      }
                    }}
                  />
                )}
      </DialogContent>
    </Dialog>
  )
}
