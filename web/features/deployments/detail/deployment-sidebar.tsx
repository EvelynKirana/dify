'use client'

import type { ComponentProps, PropsWithoutRef } from 'react'
import type { AppInfo } from '../types'
import type { InstanceDetailTabKey } from './tabs'
import type { NavIcon } from '@/app/components/app-sidebar/nav-link'
import { cn } from '@langgenius/dify-ui/cn'
import { useHover, useKeyPress } from 'ahooks'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import NavLink from '@/app/components/app-sidebar/nav-link'
import ToggleButton from '@/app/components/app-sidebar/toggle-button'
import { useStore as useAppStore } from '@/app/components/app/store'
import AppIcon from '@/app/components/base/app-icon'
import Divider from '@/app/components/base/divider'
import { getKeyboardKeyCodeBySystem } from '@/app/components/workflow/utils'
import useBreakpoints, { MediaType } from '@/hooks/use-breakpoints'

type TabDef = {
  key: InstanceDetailTabKey
  icon: NavIcon
  selectedIcon: NavIcon
}

type TailwindNavIconProps = PropsWithoutRef<ComponentProps<'svg'>> & {
  title?: string
  titleId?: string
}

function OverviewIcon({ className }: TailwindNavIconProps) {
  return <span aria-hidden className={cn('i-ri-dashboard-2-line', className)} />
}
function OverviewSelectedIcon({ className }: TailwindNavIconProps) {
  return <span aria-hidden className={cn('i-ri-dashboard-2-fill', className)} />
}
function DeployIcon({ className }: TailwindNavIconProps) {
  return <span aria-hidden className={cn('i-ri-rocket-line', className)} />
}
function DeploySelectedIcon({ className }: TailwindNavIconProps) {
  return <span aria-hidden className={cn('i-ri-rocket-fill', className)} />
}
function VersionsIcon({ className }: TailwindNavIconProps) {
  return <span aria-hidden className={cn('i-ri-stack-line', className)} />
}
function VersionsSelectedIcon({ className }: TailwindNavIconProps) {
  return <span aria-hidden className={cn('i-ri-stack-fill', className)} />
}
function AccessIcon({ className }: TailwindNavIconProps) {
  return <span aria-hidden className={cn('i-ri-plug-line', className)} />
}
function AccessSelectedIcon({ className }: TailwindNavIconProps) {
  return <span aria-hidden className={cn('i-ri-plug-fill', className)} />
}
function SettingsIcon({ className }: TailwindNavIconProps) {
  return <span aria-hidden className={cn('i-ri-settings-3-line', className)} />
}
function SettingsSelectedIcon({ className }: TailwindNavIconProps) {
  return <span aria-hidden className={cn('i-ri-settings-3-fill', className)} />
}

const TABS: TabDef[] = [
  { key: 'overview', icon: OverviewIcon, selectedIcon: OverviewSelectedIcon },
  { key: 'deploy', icon: DeployIcon, selectedIcon: DeploySelectedIcon },
  { key: 'versions', icon: VersionsIcon, selectedIcon: VersionsSelectedIcon },
  { key: 'access', icon: AccessIcon, selectedIcon: AccessSelectedIcon },
  { key: 'settings', icon: SettingsIcon, selectedIcon: SettingsSelectedIcon },
]

function isShortcutFromInputArea(target: EventTarget | null) {
  if (!(target instanceof HTMLElement))
    return false

  return target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.isContentEditable
}

type DeploymentSidebarProps = {
  instanceId: string
  instanceName: string
  instanceDescription?: string
  appModeLabel: string
  app?: AppInfo
}

export function DeploymentSidebar({
  instanceId,
  instanceName,
  instanceDescription,
  appModeLabel,
  app,
}: DeploymentSidebarProps) {
  const { t } = useTranslation('deployments')
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isHoveringSidebar = useHover(sidebarRef)
  const media = useBreakpoints()
  const isMobile = media === MediaType.mobile
  const { appSidebarExpand, setAppSidebarExpand } = useAppStore(useShallow(state => ({
    appSidebarExpand: state.appSidebarExpand,
    setAppSidebarExpand: state.setAppSidebarExpand,
  })))
  const sidebarMode = appSidebarExpand || 'expand'
  const expand = sidebarMode === 'expand'

  const handleToggle = useCallback(() => {
    setAppSidebarExpand(sidebarMode === 'expand' ? 'collapse' : 'expand')
  }, [setAppSidebarExpand, sidebarMode])

  useEffect(() => {
    const persistedMode = localStorage.getItem('app-detail-collapse-or-expand') || 'expand'
    setAppSidebarExpand(isMobile ? 'collapse' : persistedMode)
  }, [isMobile, setAppSidebarExpand])

  useEffect(() => {
    if (appSidebarExpand)
      localStorage.setItem('app-detail-collapse-or-expand', appSidebarExpand)
  }, [appSidebarExpand])

  useKeyPress(`${getKeyboardKeyCodeBySystem('ctrl')}.b`, (e) => {
    if (isShortcutFromInputArea(e.target))
      return

    e.preventDefault()
    handleToggle()
  }, { exactMatch: true, useCapture: true })

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        'flex shrink-0 flex-col border-r border-divider-burn bg-background-default-subtle transition-all',
        expand ? 'w-[216px]' : 'w-14',
      )}
    >
      <div className={cn('shrink-0', expand ? 'p-2' : 'p-1')}>
        <div className={cn('flex flex-col gap-2 rounded-lg', expand ? 'p-1' : 'items-center p-1')}>
          <div className="flex items-center gap-1">
            {app
              ? (
                  <AppIcon
                    size={expand ? 'large' : 'medium'}
                    iconType={app.iconType}
                    icon={app.icon}
                    background={app.iconBackground}
                    imageUrl={app.iconUrl}
                  />
                )
              : (
                  <div className={cn(
                    'flex items-center justify-center rounded-xl border border-divider-subtle bg-background-default text-text-tertiary',
                    expand ? 'h-10 w-10' : 'h-8 w-8',
                  )}
                  >
                    <span aria-hidden className="i-ri-apps-2-line h-5 w-5" />
                  </div>
                )}
          </div>
          {expand && (
            <div className="flex flex-col items-start gap-1">
              <div className="flex w-full">
                <div className="truncate system-md-semibold whitespace-nowrap text-text-secondary" title={instanceName}>
                  {instanceName}
                </div>
              </div>
              <div className="system-2xs-medium-uppercase whitespace-nowrap text-text-tertiary">
                {appModeLabel}
              </div>
              {instanceDescription && (
                <div
                  className="line-clamp-2 system-xs-regular text-text-tertiary"
                  title={instanceDescription}
                >
                  {instanceDescription}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative px-4 py-2">
        <Divider
          type="horizontal"
          bgStyle={expand ? 'gradient' : 'solid'}
          className={cn(
            'my-0 h-px',
            expand
              ? 'bg-linear-to-r from-divider-subtle to-background-gradient-mask-transparent'
              : 'bg-divider-subtle',
          )}
        />
        {!isMobile && isHoveringSidebar && (
          <ToggleButton
            className="absolute top-[-3.5px] -right-3 z-20"
            expand={expand}
            handleToggle={handleToggle}
          />
        )}
      </div>

      <nav
        className={cn(
          'flex grow flex-col gap-y-0.5',
          expand ? 'px-3 py-2' : 'p-3',
        )}
      >
        {TABS.map(tab => (
          <NavLink
            key={tab.key}
            mode={sidebarMode}
            iconMap={{ selected: tab.selectedIcon, normal: tab.icon }}
            name={t(`tabs.${tab.key}.name`)}
            href={`/deployments/${instanceId}/${tab.key}`}
          />
        ))}
      </nav>
    </aside>
  )
}
