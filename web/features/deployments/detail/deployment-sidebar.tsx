'use client'

import type { AppInstanceBasicInfo } from '@dify/contracts/enterprise/types.gen'
import type { ComponentProps, PropsWithoutRef } from 'react'
import type { InstanceDetailTabKey } from './tabs'
import type { NavIcon } from '@/app/components/app-sidebar/nav-link'
import { cn } from '@langgenius/dify-ui/cn'
import { useHover, useKeyPress, useLocalStorageState } from 'ahooks'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getAppModeLabel } from '@/app/components/app-sidebar/app-info/app-mode-labels'
import NavLink from '@/app/components/app-sidebar/nav-link'
import ToggleButton from '@/app/components/app-sidebar/toggle-button'
import AppIcon from '@/app/components/base/app-icon'
import Divider from '@/app/components/base/divider'
import { getKeyboardKeyCodeBySystem } from '@/app/components/workflow/utils'
import useBreakpoints, { MediaType } from '@/hooks/use-breakpoints'
import { toAppMode } from '../utils'

type TabDef = {
  key: InstanceDetailTabKey
  icon: NavIcon
  selectedIcon: NavIcon
}

type DeploymentSidebarMode = 'expand' | 'collapse'

const DEPLOYMENT_SIDEBAR_MODE_KEY = 'deployment-sidebar-collapse-or-expand'

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

function useDeploymentSidebarMode(isMobile: boolean) {
  const [persistedMode, setPersistedMode] = useLocalStorageState<DeploymentSidebarMode>(
    DEPLOYMENT_SIDEBAR_MODE_KEY,
    { defaultValue: 'expand' },
  )
  const sidebarMode = isMobile ? 'collapse' : persistedMode ?? 'expand'

  function toggleSidebarMode() {
    setPersistedMode(sidebarMode === 'expand' ? 'collapse' : 'expand')
  }

  return {
    sidebarMode,
    toggleSidebarMode,
  }
}

type DeploymentSidebarProps = {
  app: AppInstanceBasicInfo
}

export function DeploymentSidebar({
  app,
}: DeploymentSidebarProps) {
  const { t } = useTranslation('deployments')
  const { t: tCommon } = useTranslation()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isHoveringSidebar = useHover(sidebarRef)
  const media = useBreakpoints()
  const isMobile = media === MediaType.mobile
  const { sidebarMode, toggleSidebarMode } = useDeploymentSidebarMode(isMobile)
  const expand = sidebarMode === 'expand'
  const appInstanceId = app.id ?? ''
  const instanceName = app.name ?? appInstanceId
  const appModeLabel = getAppModeLabel(toAppMode(app.mode), tCommon)

  useKeyPress(`${getKeyboardKeyCodeBySystem('ctrl')}.b`, (e) => {
    if (isShortcutFromInputArea(e.target))
      return

    e.preventDefault()
    toggleSidebarMode()
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
            <AppIcon
              size={expand ? 'large' : 'medium'}
              iconType="emoji"
              icon={app.icon}
              background={app.iconBackground}
            />
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
              {app.description && (
                <div
                  className="line-clamp-2 system-xs-regular text-text-tertiary"
                  title={app.description}
                >
                  {app.description}
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
            handleToggle={toggleSidebarMode}
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
            href={`/deployments/${appInstanceId}/${tab.key}`}
          />
        ))}
      </nav>
    </aside>
  )
}
