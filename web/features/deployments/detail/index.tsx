'use client'

import type { ReactNode } from 'react'
import type { InstanceDetailTabKey } from './tabs'
import { useTranslation } from 'react-i18next'
import useDocumentTitle from '@/hooks/use-document-title'
import { useSelectedLayoutSegment } from '@/next/navigation'
import { DeployDrawer } from '../components/deploy-drawer'
import { DeploymentSidebar } from './deployment-sidebar'
import { isInstanceDetailTabKey } from './tabs'

export function InstanceDetail({ appInstanceId, children }: {
  appInstanceId: string
  children: ReactNode
}) {
  const { t } = useTranslation('deployments')
  const selectedSegment = useSelectedLayoutSegment()
  const selectedTab = selectedSegment ?? undefined
  const activeTab: InstanceDetailTabKey = isInstanceDetailTabKey(selectedTab) ? selectedTab : 'overview'

  useDocumentTitle(t('documentTitle.detail'))

  return (
    <>
      <div className="relative flex h-full overflow-hidden rounded-t-2xl shadow-xs">
        <DeploymentSidebar appInstanceId={appInstanceId} />
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
    </>
  )
}
