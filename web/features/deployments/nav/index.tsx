'use client'

import type { NavItem } from '@/app/components/header/nav/nav-selector'
import type { AppIconType, AppModeEnum } from '@/types/app'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Nav from '@/app/components/header/nav'
import { useParams, useRouter, useSelectedLayoutSegment } from '@/next/navigation'
import { useSourceApps } from '../hooks/use-source-apps'
import { useDeploymentsStore } from '../store'

const DeploymentsNav = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const selectedSegment = useSelectedLayoutSegment()
  const isActive = selectedSegment === 'deployments'
  const params = useParams<{ instanceId?: string }>()
  const instanceId = params?.instanceId

  const sourceApps = useDeploymentsStore(state => state.sourceApps)
  const openCreateInstanceModal = useDeploymentsStore(state => state.openCreateInstanceModal)

  const { appMap } = useSourceApps({ enabled: isActive })
  const apps = useMemo(
    () => sourceApps.length > 0 ? sourceApps : [...appMap.values()],
    [appMap, sourceApps],
  )

  const navigationItems = useMemo<NavItem[]>(() => {
    if (!isActive)
      return []
    return apps.map((app) => {
      return {
        id: app.id,
        name: app.name,
        link: `/deployments/${app.id}/overview`,
        icon_type: (app.iconType ?? null) as AppIconType | null,
        icon: app.icon ?? '',
        icon_background: app.iconBackground ?? null,
        icon_url: app.iconUrl ?? null,
        mode: app.mode as unknown as AppModeEnum | undefined,
      }
    })
  }, [apps, isActive])

  const curNav = useMemo(() => {
    if (!instanceId)
      return undefined
    return navigationItems.find(item => item.id === instanceId)
  }, [instanceId, navigationItems])

  const handleCreate = useCallback(() => {
    openCreateInstanceModal()
    if (selectedSegment !== 'deployments' || instanceId)
      router.push('/deployments')
  }, [openCreateInstanceModal, router, selectedSegment, instanceId])

  return (
    <Nav
      isApp={false}
      icon={<span aria-hidden className="i-ri-rocket-line h-4 w-4" />}
      activeIcon={<span aria-hidden className="i-ri-rocket-fill h-4 w-4" />}
      text={t('menus.deployments', { ns: 'common' })}
      activeSegment="deployments"
      link="/deployments"
      curNav={curNav}
      navigationItems={navigationItems}
      createText={t('deployments:createModal.title')}
      onCreate={handleCreate}
    />
  )
}

export default DeploymentsNav
