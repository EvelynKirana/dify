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
  releaseCommit,
  releaseLabel,
  targetRelease,
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
  const pending = targetRelease(row)
  const env = row.environment
  const observedBindings = row.observedRuntime?.bindings
  const pendingBindings = row.pendingDeployment?.bindings
  const credentials = [...observedBindings?.credentials ?? [], ...pendingBindings?.credentials ?? []]
  const envVars = [...observedBindings?.envVars ?? [], ...pendingBindings?.envVars ?? []]

  return (
    <div className="border-t border-divider-subtle bg-background-default-subtle px-6 py-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="system-sm-semibold text-text-primary">
          {environmentName(env)}
          {' · '}
          {releaseLabel(observed || pending)}
        </span>
        <ModeBadge mode={environmentMode(env)} />
        <HealthBadge health={environmentHealth(env)} />
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        <InfoBlock title={t('deployTab.panel.instanceInfo')}>
          <InfoRow label={t('deployTab.panel.deploymentId')} value={deploymentId(row) || '—'} mono />
          <InfoRow label={t('deployTab.panel.replicas')} value={row.instance?.replicas != null ? String(row.instance.replicas) : '—'} />
          <InfoRow label={t('deployTab.panel.runtimeMode')} value={t(environmentMode(env) === 'isolated' ? 'mode.isolated' : 'mode.shared')} suffix={` / ${environmentBackend(env).toUpperCase()}`} />
          <InfoRow label={t('deployTab.panel.runtimeNote')} value={row.instance?.status ?? '—'} />
        </InfoBlock>

        <InfoBlock title={t('deployTab.panel.releaseInfo')}>
          <InfoRow label={t('deployTab.panel.release')} value={releaseLabel(observed || pending)} mono />
          <InfoRow label={t('deployTab.panel.commit')} value={releaseCommit(observed || pending)} mono />
          <InfoRow label={t('deployTab.panel.createdAt')} value={formatDate((observed || pending)?.createdAt)} />
          {pending && (
            <InfoRow label={t('deployTab.panel.targetRelease')} value={`${releaseLabel(pending)} / ${releaseCommit(pending)}`} mono />
          )}
          {row.instance?.lastError?.releaseId && (
            <InfoRow label={t('deployTab.panel.failedRelease')} value={row.instance.lastError.releaseId} mono />
          )}
        </InfoBlock>

        <InfoBlock title={t('deployTab.panel.endpoints')}>
          <InfoRow label={t('deployTab.panel.run')} value={row.observedRuntime?.endpoints?.run ?? '—'} mono />
          <InfoRow label={t('deployTab.panel.health')} value={row.observedRuntime?.endpoints?.health ?? '—'} mono />
        </InfoBlock>

        {credentials.length > 0 && (
          <InfoBlock title={t('deployTab.panel.modelCreds')}>
            {credentials.map(c => (
              <InfoRow
                key={`${c.slot}-${c.displayName}-${c.maskedValue}`}
                label={c.slot ?? '—'}
                value={c.displayName || c.maskedValue || '—'}
                mono
              />
            ))}
          </InfoBlock>
        )}

        {envVars.length > 0 && (
          <InfoBlock title={t('deployTab.panel.envVars')}>
            {envVars.map(v => (
              <InfoRow
                key={`${v.slot}-${v.displayName}`}
                label={v.slot ?? '—'}
                value={v.maskedValue || v.displayName || '—'}
                mono
              />
            ))}
          </InfoBlock>
        )}
      </div>

      {row.instance?.lastError?.message && (
        <div className="mt-4 rounded-lg border border-util-colors-red-red-200 bg-util-colors-red-red-50 px-3 py-2 system-xs-regular text-util-colors-red-red-700">
          {row.instance.lastError.message}
        </div>
      )}
    </div>
  )
}
