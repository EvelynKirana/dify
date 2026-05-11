'use client'

import { Dialog, DialogCloseButton, DialogContent } from '@langgenius/dify-ui/dialog'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useAtomValue, useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { consoleQuery } from '@/service/client'
import { DEPLOYMENT_PAGE_SIZE } from '../data'
import {
  closeDeployDrawerAtom,
  deployDrawerAppInstanceIdAtom,
  deployDrawerEnvironmentIdAtom,
  deployDrawerOpenAtom,
  deployDrawerReleaseIdAtom,
} from '../store'
import { DeployForm } from './deploy-drawer/form'

export function DeployDrawer() {
  const { t } = useTranslation('deployments')
  const open = useAtomValue(deployDrawerOpenAtom)
  const drawerAppInstanceId = useAtomValue(deployDrawerAppInstanceIdAtom)
  const drawerEnvironmentId = useAtomValue(deployDrawerEnvironmentIdAtom)
  const drawerReleaseId = useAtomValue(deployDrawerReleaseIdAtom)
  const closeDeployDrawer = useSetAtom(closeDeployDrawerAtom)
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

  const environments = environmentOptionsReply?.environments
    ?.filter(environment => environment.id)
    .map(environment => ({
      ...environment,
      disabled: environment.deployable === false,
    })) ?? []
  const releases = releaseHistory?.data?.filter(release => release.id) ?? []
  const defaultReleaseId = releases[0]?.id
  const formKey = `${drawerAppInstanceId ?? 'none'}-${drawerEnvironmentId ?? 'any'}-${drawerReleaseId ?? 'new'}-${open ? '1' : '0'}`

  return (
    <Dialog
      open={open}
      onOpenChange={next => !next && closeDeployDrawer()}
    >
      <DialogContent className="w-140 max-w-[90vw]">
        <DialogCloseButton />
        {!drawerAppInstanceId
          ? <div className="p-4 text-text-tertiary">{t('deployDrawer.notFound')}</div>
          : (!releaseHistory || !environmentOptionsReply)
              ? (
                  <div className="flex items-center gap-2 p-4 system-sm-regular text-text-tertiary">
                    <span className="size-4 animate-spin rounded-full border-2 border-components-panel-border border-t-transparent" />
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
                    lockedEnvId={drawerEnvironmentId}
                    presetReleaseId={drawerReleaseId}
                  />
                )}
      </DialogContent>
    </Dialog>
  )
}
