'use client'

import type { FC, ReactNode } from 'react'
import type { EnvironmentDeploymentRow } from '@/contract/console/deployments'
import { cn } from '@langgenius/dify-ui/cn'
import { useTranslation } from 'react-i18next'
import { HealthBadge, ModeBadge } from '../../components/status-badge'
import {
  activeRelease,
  deploymentId,
  environmentBackend,
  environmentHealth,
  environmentMode,
  environmentName,
  formatDate,
  isRuntimeEnvVarBinding,
  isRuntimeModelBinding,
  isRuntimePluginBinding,
  releaseCommit,
  releaseLabel,
  runtimeBindingLabel,
  runtimeBindingValue,
} from '../../utils'

type InfoBlockProps = {
  title: string
  children: ReactNode
}

const InfoBlock: FC<InfoBlockProps> = ({ title, children }) => (
  <div className="flex flex-col gap-1.5">
    <div className="system-xs-medium-uppercase text-text-tertiary">{title}</div>
    <div className="flex flex-col gap-1">{children}</div>
  </div>
)

type InfoRowProps = {
  label: string
  value: ReactNode
  mono?: boolean
  suffix?: string
}

const InfoRow: FC<InfoRowProps> = ({ label, value, mono, suffix }) => (
  <div className="flex items-start gap-2 py-0.5">
    <span className="w-24 shrink-0 system-xs-regular text-text-tertiary">{label}</span>
    <span className={cn('min-w-0 flex-1 system-sm-regular break-words text-text-primary', mono && 'font-mono')}>
      {value}
      {suffix && <span className="system-xs-regular text-text-tertiary">{suffix}</span>}
    </span>
  </div>
)

type DeploymentPanelProps = {
  row: EnvironmentDeploymentRow
}

export const DeploymentPanel: FC<DeploymentPanelProps> = ({ row }) => {
  const { t } = useTranslation('deployments')
  const observed = activeRelease(row)
  const env = row.environment
  const endpoints = row.detail?.endpoints
  const detailBindings = row.detail?.bindings ?? []
  const modelCredentials = detailBindings.filter(isRuntimeModelBinding)
  const pluginCredentials = detailBindings.filter(isRuntimePluginBinding)
  const envVars = detailBindings.filter(isRuntimeEnvVarBinding)

  return (
    <div className="border-t border-divider-subtle bg-background-default-subtle px-6 py-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="system-sm-semibold text-text-primary">
          {environmentName(env)}
          {' · '}
          {releaseLabel(observed)}
        </span>
        <ModeBadge mode={environmentMode(env)} />
        <HealthBadge health={environmentHealth(env)} />
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        <InfoBlock title={t('deployTab.panel.instanceInfo')}>
          <InfoRow label={t('deployTab.panel.deploymentId')} value={deploymentId(row) || '—'} mono />
          <InfoRow label={t('deployTab.panel.replicas')} value={row.detail?.replicas != null ? String(row.detail.replicas) : '—'} />
          <InfoRow label={t('deployTab.panel.runtimeMode')} value={row.detail?.runtimeMode ?? t(environmentMode(env) === 'isolated' ? 'mode.isolated' : 'mode.shared')} suffix={` / ${environmentBackend(env).toUpperCase()}`} />
          <InfoRow label={t('deployTab.panel.runtimeNote')} value={row.detail?.runtimeNote ?? row.status ?? '—'} />
        </InfoBlock>

        <InfoBlock title={t('deployTab.panel.releaseInfo')}>
          <InfoRow label={t('deployTab.panel.release')} value={releaseLabel(observed)} mono />
          <InfoRow label={t('deployTab.panel.commit')} value={releaseCommit(observed)} mono />
          <InfoRow label={t('deployTab.panel.createdAt')} value={formatDate(observed?.createdAt)} />
          <InfoRow label={t('deployTab.panel.targetRelease')} value="—" mono />
          <InfoRow label={t('deployTab.panel.failedRelease')} value="—" mono />
        </InfoBlock>

        <InfoBlock title={t('deployTab.panel.endpoints')}>
          <InfoRow label={t('deployTab.panel.run')} value={endpoints?.run ?? '—'} mono />
          <InfoRow label={t('deployTab.panel.health')} value={endpoints?.health ?? '—'} mono />
        </InfoBlock>

        {modelCredentials.length > 0 && (
          <InfoBlock title={t('deployTab.panel.modelCreds')}>
            {modelCredentials.map(c => (
              <InfoRow
                key={`${c.kind}-${c.slot}-${c.label}-${c.displayName}-${c.displayValue}-${c.maskedValue}`}
                label={runtimeBindingLabel(c)}
                value={runtimeBindingValue(c)}
                mono
              />
            ))}
          </InfoBlock>
        )}

        {pluginCredentials.length > 0 && (
          <InfoBlock title={t('deployTab.panel.pluginCreds')}>
            {pluginCredentials.map(c => (
              <InfoRow
                key={`${c.kind}-${c.slot}-${c.label}-${c.displayName}-${c.displayValue}-${c.maskedValue}`}
                label={runtimeBindingLabel(c)}
                value={runtimeBindingValue(c)}
                mono
              />
            ))}
          </InfoBlock>
        )}

        {envVars.length > 0 && (
          <InfoBlock title={t('deployTab.panel.envVars')}>
            {envVars.map(v => (
              <InfoRow
                key={`${v.kind}-${v.slot}-${v.label}-${v.displayName}-${v.displayValue}`}
                label={runtimeBindingLabel(v)}
                value={runtimeBindingValue(v)}
                mono
              />
            ))}
          </InfoBlock>
        )}
      </div>

      {row.status?.toLowerCase().includes('fail') && row.detail?.runtimeNote && (
        <div className="mt-4 rounded-lg border border-util-colors-red-red-200 bg-util-colors-red-red-50 px-3 py-2 system-xs-regular text-util-colors-red-red-700">
          {row.detail.runtimeNote}
        </div>
      )}
    </div>
  )
}
