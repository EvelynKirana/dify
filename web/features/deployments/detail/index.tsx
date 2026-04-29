'use client'

import type { FC, ReactNode } from 'react'
import type { AppInfo, AppMode } from '../types'
import type { InstanceDetailTabKey } from './tabs'
import type { AppInstanceOverview } from '@/contract/console/deployments'
import { Button } from '@langgenius/dify-ui/button'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getAppModeLabel } from '@/app/components/app-sidebar/app-info/app-mode-labels'
import useDocumentTitle from '@/hooks/use-document-title'
import { useRouter, useSelectedLayoutSegment } from '@/next/navigation'
import DeployDrawer from '../components/deploy-drawer'
import RollbackModal from '../components/rollback-modal'
import { useDeploymentData } from '../hooks/use-deployment-data'
import { useSourceApps } from '../hooks/use-source-apps'
import { useDeploymentsStore } from '../store'
import { deployedRows, deploymentStatus } from '../utils'
import { DeploymentSidebar } from './deployment-sidebar'
import { isInstanceDetailTabKey } from './tabs'

function toAppInfoFromOverview(instance?: AppInstanceOverview): AppInfo | undefined {
  if (!instance?.id)
    return undefined

  return {
    id: instance.id,
    name: instance.name ?? instance.id,
    mode: (instance.mode || 'workflow') as AppMode,
    iconType: 'emoji',
    icon: instance.icon,
    description: instance.description ?? undefined,
    sourceAppId: instance.sourceAppId,
    sourceAppName: instance.sourceAppName,
  }
}

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
  const sourceApps = useDeploymentsStore(state => state.sourceApps)
  const appData = useDeploymentsStore(state => state.appData)
  const { appMap, isLoading: isLoadingApps } = useSourceApps()
  useDocumentTitle(t('documentTitle.detail'))

  const appDataForInstance = appData[instanceId]
  const appFromData = useMemo(
    () => toAppInfoFromOverview(appDataForInstance?.overview.instance),
    [appDataForInstance?.overview.instance],
  )
  const app = useMemo(
    () => sourceApps.find(item => item.id === instanceId) ?? appMap.get(instanceId) ?? appFromData,
    [sourceApps, instanceId, appMap, appFromData],
  )
  const detailApps = useMemo<AppInfo[]>(() => [
    app ?? {
      id: instanceId,
      name: instanceId,
      mode: 'workflow',
    },
  ], [app, instanceId])
  const detailQuery = useDeploymentData(detailApps, { enabled: Boolean(instanceId) })
  const appDeployments = useMemo(
    () => deployedRows(appData[instanceId]?.environmentDeployments.data),
    [appData, instanceId],
  )

  if (!app && (isLoadingApps || detailQuery.isLoading || detailQuery.isFetching)) {
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

  const deployingCount = appDeployments.filter(row => deploymentStatus(row) === 'deploying').length
  const failedCount = appDeployments.filter(row => deploymentStatus(row) === 'deploy_failed').length
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
                <span>{t('detail.envCount', { count: appDeployments.length })}</span>
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
