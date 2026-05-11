'use client'

import type { ReleaseRuntimeBinding, RuntimeInstanceRow } from '@dify/contracts/enterprise/types.gen'
import type { ReactNode } from 'react'
import { cn } from '@langgenius/dify-ui/cn'
import { useTranslation } from 'react-i18next'
import { environmentBackend, environmentMode } from '../../environment'
import { formatDate, releaseCommit, releaseLabel } from '../../release'
import {
  isRuntimeEnvVarBinding,
  isRuntimeModelBinding,
  isRuntimePluginBinding,
  runtimeBindingSummary,
} from '../../runtime-bindings'

function InfoBlock({ title, children }: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0 rounded-lg bg-background-default px-3 py-2.5">
      <div className="mb-2 system-xs-medium-uppercase text-text-tertiary">{title}</div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

type InfoRowProps = {
  label: string
  value: ReactNode
  mono?: boolean
  suffix?: string
}

function InfoRow({ label, value, mono, suffix }: InfoRowProps) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(88px,0.35fr)_minmax(0,1fr)] items-start gap-2">
      <span className="system-xs-regular text-text-tertiary">{label}</span>
      <span className={cn('min-w-0 system-sm-regular break-all text-text-primary', mono && 'font-mono')}>
        {value}
        {suffix && <span className="system-xs-regular text-text-tertiary">{suffix}</span>}
      </span>
    </div>
  )
}

function RuntimeBindingItem({ binding }: {
  binding: ReleaseRuntimeBinding
}) {
  const summary = runtimeBindingSummary(binding)

  return (
    <div className="min-w-0">
      <span className="block min-w-0 truncate system-xs-regular text-text-tertiary" title={summary}>
        {summary}
      </span>
    </div>
  )
}

export function DeploymentPanel({ row }: {
  row: RuntimeInstanceRow
}) {
  const { t } = useTranslation('deployments')
  const observed = row.currentRelease
  const env = row.environment
  const endpoints = row.detail?.endpoints
  const detailBindings = row.detail?.bindings ?? []
  const modelCredentials = detailBindings.filter(isRuntimeModelBinding)
  const pluginCredentials = detailBindings.filter(isRuntimePluginBinding)
  const envVars = detailBindings.filter(isRuntimeEnvVarBinding)

  return (
    <div className="border-t border-divider-subtle bg-background-default-subtle px-4 py-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <InfoBlock title={t('deployTab.panel.instanceInfo')}>
          <InfoRow label={t('deployTab.panel.deploymentId')} value={row.id || '—'} mono />
          <InfoRow label={t('deployTab.panel.replicas')} value={row.detail?.replicas != null ? String(row.detail.replicas) : '—'} />
          <InfoRow label={t('deployTab.panel.runtimeMode')} value={row.detail?.runtimeMode ?? t(environmentMode(env) === 'isolated' ? 'mode.isolated' : 'mode.shared')} suffix={` / ${environmentBackend(env).toUpperCase()}`} />
          <InfoRow label={t('deployTab.panel.runtimeNote')} value={row.detail?.runtimeNote ?? row.status ?? '—'} />
        </InfoBlock>

        <InfoBlock title={t('deployTab.panel.releaseInfo')}>
          <InfoRow label={t('deployTab.panel.release')} value={releaseLabel(observed)} mono />
          <InfoRow label={t('deployTab.panel.commit')} value={releaseCommit(observed)} mono />
          <InfoRow label={t('deployTab.panel.createdAt')} value={formatDate(observed?.createdAt)} />
        </InfoBlock>

        <InfoBlock title={t('deployTab.panel.endpoints')}>
          <InfoRow label={t('deployTab.panel.run')} value={endpoints?.run ?? '—'} mono />
          <InfoRow label={t('deployTab.panel.health')} value={endpoints?.health ?? '—'} mono />
        </InfoBlock>

        {(modelCredentials.length > 0 || pluginCredentials.length > 0 || envVars.length > 0) && (
          <div className="xl:col-span-2">
            <InfoBlock title={t('deployTab.panel.runtimeBindings')}>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {modelCredentials.map(c => (
                  <RuntimeBindingItem
                    key={`${c.kind}-${c.label}-${c.displayValue}`}
                    binding={c}
                  />
                ))}
                {pluginCredentials.map(c => (
                  <RuntimeBindingItem
                    key={`${c.kind}-${c.label}-${c.displayValue}`}
                    binding={c}
                  />
                ))}
                {envVars.map(v => (
                  <RuntimeBindingItem
                    key={`${v.kind}-${v.label}-${v.displayValue}`}
                    binding={v}
                  />
                ))}
              </div>
            </InfoBlock>
          </div>
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
