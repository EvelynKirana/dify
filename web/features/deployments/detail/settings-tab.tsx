'use client'
import type { FC } from 'react'
import type { AppInfo } from '../types'
import { Button } from '@langgenius/dify-ui/button'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useSourceApps } from '../hooks/use-source-apps'
import { useDeploymentsStore } from '../store'
import { deployedRows } from '../utils'

type SettingsTabProps = {
  instanceId: string
}

type SettingsFormProps = {
  app: AppInfo
  hasDeployments: boolean
}

const SettingsForm: FC<SettingsFormProps> = ({ app, hasDeployments }) => {
  const { t } = useTranslation('deployments')

  return (
    <div className="flex max-w-[640px] flex-col gap-5 p-6">
      <div className="flex flex-col gap-3 rounded-xl border border-components-panel-border bg-components-panel-bg p-4">
        <div className="system-sm-semibold text-text-primary">{t('settings.general')}</div>
        <div className="system-xs-regular text-text-tertiary">{t('settings.readOnly')}</div>
        <div className="flex flex-col gap-2">
          <label className="system-xs-medium-uppercase text-text-tertiary" htmlFor="settings-name">
            {t('settings.name')}
          </label>
          <input
            id="settings-name"
            type="text"
            value={app.name}
            readOnly
            disabled
            className="flex h-8 items-center rounded-lg border-[0.5px] border-components-input-border-active bg-components-input-bg-normal px-3 text-[13px] font-medium text-text-secondary outline-hidden placeholder:text-text-quaternary disabled:opacity-70"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="system-xs-medium-uppercase text-text-tertiary" htmlFor="settings-desc">
            {t('settings.description')}
          </label>
          <textarea
            id="settings-desc"
            value={app.description ?? ''}
            readOnly
            disabled
            className="min-h-[96px] rounded-lg border-[0.5px] border-components-input-border-active bg-components-input-bg-normal px-3 py-2 text-[13px] text-text-secondary outline-hidden placeholder:text-text-quaternary disabled:opacity-70"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled>
            {t('settings.reset')}
          </Button>
          <Button variant="primary" disabled>
            {t('settings.save')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-util-colors-red-red-200 bg-util-colors-red-red-50 p-4">
        <div className="system-sm-semibold text-util-colors-red-red-700">{t('settings.danger')}</div>
        <div className="system-xs-regular text-util-colors-red-red-600">
          {t('settings.dangerDesc')}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="system-xs-regular text-text-tertiary">
            {hasDeployments
              ? t('settings.undeployFirst')
              : t('settings.deleteUnsupported')}
          </div>
          <Button
            variant="primary"
            tone="destructive"
            disabled
          >
            {t('settings.delete')}
          </Button>
        </div>
      </div>
    </div>
  )
}

const SettingsTab: FC<SettingsTabProps> = ({ instanceId }) => {
  const sourceApps = useDeploymentsStore(state => state.sourceApps)
  const appData = useDeploymentsStore(state => state.appData[instanceId])
  const { appMap } = useSourceApps()
  const app = sourceApps.find(item => item.id === instanceId) ?? appMap.get(instanceId)

  if (!app)
    return null

  const hasDeployments = deployedRows(appData?.environmentDeployments.environmentDeployments).length > 0
  const formKey = `${app.id}-${app.name}-${app.description ?? ''}`

  return <SettingsForm key={formKey} app={app} hasDeployments={hasDeployments} />
}

export default SettingsTab
