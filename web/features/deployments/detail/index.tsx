'use client'

import type { ReactNode } from 'react'
import type { InstanceDetailTabKey } from './tabs'
import { Button } from '@langgenius/dify-ui/button'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getAppModeLabel } from '@/app/components/app-sidebar/app-info/app-mode-labels'
import useDocumentTitle from '@/hooks/use-document-title'
import { useRouter, useSelectedLayoutSegment } from '@/next/navigation'
import { consoleQuery } from '@/service/client'
import { DeployDrawer } from '../components/deploy-drawer'
import { RollbackModal } from '../components/rollback-modal'
import { toAppInfoFromOverview } from '../utils'
import { DeploymentSidebar } from './deployment-sidebar'
import { isInstanceDetailTabKey } from './tabs'

export function InstanceDetail({ instanceId, children }: {
  instanceId: string
  children: ReactNode
}) {
  const { t } = useTranslation('deployments')
  const { t: tCommon } = useTranslation()
  const router = useRouter()
  const selectedSegment = useSelectedLayoutSegment()
  const selectedTab = selectedSegment ?? undefined
  const activeTab: InstanceDetailTabKey = isInstanceDetailTabKey(selectedTab) ? selectedTab : 'overview'
  const overviewQuery = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceOverview.queryOptions({
    input: {
      params: { appInstanceId: instanceId },
    },
  }))

  useDocumentTitle(t('documentTitle.detail'))

  const app = toAppInfoFromOverview(overviewQuery.data?.instance)

  if (!app && overviewQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background-body">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-components-panel-border border-t-transparent" />
      </div>
    )
  }

  if (!app) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-background-body">
        <div className="title-xl-semi-bold text-text-primary">{t('detail.notFound')}</div>
        <Button variant="secondary" onClick={() => router.push('/deployments')}>
          <span aria-hidden className="i-ri-arrow-left-line h-4 w-4" />
          {t('detail.backToInstances')}
        </Button>
      </div>
    )
  }
  const appModeLabel = app ? getAppModeLabel(app.mode, tCommon) : t('detail.sourceAppDeleted')

  return (
    <>
      <div className="relative flex h-full overflow-hidden rounded-t-2xl shadow-[0_0_5px_rgba(0,0,0,0.05),0_0_2px_-1px_rgba(0,0,0,0.03)]">
        <DeploymentSidebar
          instanceId={instanceId}
          instanceName={app.name}
          instanceDescription={app.description}
          appModeLabel={appModeLabel}
          app={app}
        />

        <div className="grow overflow-hidden bg-components-panel-bg">
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-solid border-b-divider-regular px-6 py-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="title-md-semi-bold text-text-primary">{t(`tabs.${activeTab}.name`)}</div>
                </div>
                <div className="system-xs-regular text-text-tertiary">{t(`tabs.${activeTab}.description`)}</div>
              </div>
            </div>
            <div className="grow overflow-y-auto">
              {children}
            </div>
          </div>
        </div>
      </div>

      <DeployDrawer />
      <RollbackModal />
    </>
  )
}
