'use client'

import type { FC, ReactNode } from 'react'
import type { InstanceDetailTabKey } from './tabs'
import { Button } from '@langgenius/dify-ui/button'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getAppModeLabel } from '@/app/components/app-sidebar/app-info/app-mode-labels'
import useDocumentTitle from '@/hooks/use-document-title'
import { useRouter, useSelectedLayoutSegment } from '@/next/navigation'
import { consoleQuery } from '@/service/client'
import DeployDrawer from '../components/deploy-drawer'
import RollbackModal from '../components/rollback-modal'
import {
  SOURCE_APPS_PAGE_SIZE,
} from '../data'
import {
  deploymentSummariesFromList,
  sourceAppMapFromApps,
  sourceAppsFromList,
} from '../utils'
import { DeploymentSidebar } from './deployment-sidebar'
import { isInstanceDetailTabKey } from './tabs'

type InstanceDetailProps = {
  instanceId: string
  children: ReactNode
}

const InstanceDetail: FC<InstanceDetailProps> = ({ instanceId, children }) => {
  const { t } = useTranslation('deployments')
  const { t: tCommon } = useTranslation()
  const router = useRouter()
  const selectedSegment = useSelectedLayoutSegment()
  const selectedTab = selectedSegment ?? undefined
  const activeTab: InstanceDetailTabKey = isInstanceDetailTabKey(selectedTab) ? selectedTab : 'overview'
  const listQuery = useQuery(consoleQuery.deployments.list.queryOptions({
    input: {
      query: {
        pageNumber: 1,
        resultsPerPage: SOURCE_APPS_PAGE_SIZE,
      },
    },
  }))
  useDocumentTitle(t('documentTitle.detail'))

  const apps = useMemo(() => sourceAppsFromList(listQuery.data), [listQuery.data])
  const appMap = useMemo(() => sourceAppMapFromApps(apps), [apps])
  const summaries = useMemo(() => deploymentSummariesFromList(listQuery.data), [listQuery.data])
  const app = useMemo(
    () => appMap.get(instanceId),
    [instanceId, appMap],
  )
  const summary = summaries[instanceId]
  const statusCount = (status: string) =>
    summary?.statuses?.find(item => item.status === status)?.count ?? 0
  const envCount = summary?.statuses
    ?.filter(item => item.status !== 'undeployed')
    .reduce((total, item) => total + (item.count ?? 0), 0) ?? 0

  if (!app && listQuery.isLoading) {
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

  const deployingCount = statusCount('deploying')
  const failedCount = statusCount('failed') + statusCount('deploy_failed')
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
              <div className="flex items-center gap-2 system-xs-regular text-text-tertiary">
                <span>{t('detail.envCount', { count: envCount })}</span>
                {deployingCount > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-util-colors-warning-warning-700">
                      {t('detail.deployingCount', { count: deployingCount })}
                    </span>
                  </>
                )}
                {failedCount > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-util-colors-red-red-700">
                      {t('detail.failedCount', { count: failedCount })}
                    </span>
                  </>
                )}
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

export default InstanceDetail
