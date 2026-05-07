'use client'

import type { AppInstanceBasicInfo, AppInstanceCard } from '@dify/contracts/enterprise/types.gen'
import type { NavItem } from '@/app/components/header/nav/nav-selector'
import type { AppModeEnum } from '@/types/app'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import Nav from '@/app/components/header/nav'
import { useParams, useRouter, useSelectedLayoutSegment } from '@/next/navigation'
import { consoleQuery } from '@/service/client'
import { SOURCE_APPS_PAGE_SIZE } from '../data'
import { openCreateInstanceModalAtom } from '../store'

function navItemFromListApp(app: AppInstanceCard): NavItem[] {
  if (!app.id || !app.name)
    return []

  return [{
    id: app.id,
    name: app.name,
    link: `/deployments/${app.id}/overview`,
    icon_type: 'emoji',
    icon: app.icon ?? '',
    icon_background: app.iconBackground ?? null,
    icon_url: null,
    mode: app.mode as AppModeEnum | undefined,
  }]
}

function navItemFromOverview(instance?: AppInstanceBasicInfo): NavItem | undefined {
  if (!instance?.id)
    return undefined

  const name = instance.name ?? instance.id

  return {
    id: instance.id,
    name,
    link: `/deployments/${instance.id}/overview`,
    icon_type: 'emoji',
    icon: instance.icon ?? '',
    icon_background: instance.iconBackground ?? null,
    icon_url: null,
    mode: instance.mode as AppModeEnum | undefined,
  }
}

export function DeploymentsNav() {
  const { t } = useTranslation()
  const router = useRouter()
  const selectedSegment = useSelectedLayoutSegment()
  const isActive = selectedSegment === 'deployments'
  const params = useParams<{ instanceId?: string }>()
  const instanceId = params?.instanceId

  const openCreateInstanceModal = useSetAtom(openCreateInstanceModalAtom)
  const { data: currentInstance } = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceOverview.queryOptions({
    input: instanceId
      ? { params: { appInstanceId: instanceId } }
      : skipToken,
    enabled: isActive && Boolean(instanceId),
    select: data => data.instance,
  }))

  const listQuery = useQuery(consoleQuery.enterprise.appDeploy.listAppInstances.queryOptions({
    input: {
      query: {
        pageNumber: 1,
        resultsPerPage: SOURCE_APPS_PAGE_SIZE,
      },
    },
    enabled: isActive,
  }))
  const appNavItems = listQuery.data?.data?.flatMap(navItemFromListApp) ?? []
  const currentNavItem = navItemFromOverview(currentInstance)

  const navigationItems: NavItem[] = isActive
    ? currentNavItem && !appNavItems.some(item => item.id === currentNavItem.id)
      ? [...appNavItems, currentNavItem]
      : appNavItems
    : []

  const curNav = instanceId
    ? navigationItems.find(item => item.id === instanceId)
    : undefined

  function handleCreate() {
    openCreateInstanceModal()
    if (selectedSegment !== 'deployments' || instanceId)
      router.push('/deployments')
  }

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
