'use client'

import type { FC } from 'react'
import type { ConsoleReleaseSummary, EnvironmentOption, RuntimeBindingDisplay } from '@/features/deployments/types'
import { Button } from '@langgenius/dify-ui/button'
import { DialogDescription, DialogTitle } from '@langgenius/dify-ui/dialog'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '@/app/components/base/input'
import { consoleQuery } from '@/service/client'
import {
  environmentMode,
  environmentName,
  isRuntimeEnvVarBinding,
  isRuntimeModelBinding,
  isRuntimePluginBinding,
  releaseCommit,
  releaseLabel,
  runtimeBindingLabel,
  runtimeBindingValue,
} from '../../utils'
import {
  DeploymentSelect,
  EnvironmentRow,
  Field,
} from './select'

export type DeployFormSubmit = {
  environmentId: string
  releaseId?: string
  releaseNote?: string
}

type DeployFormProps = {
  appInstanceId: string
  environments: EnvironmentOption[]
  releases: ConsoleReleaseSummary[]
  defaultReleaseId?: string
  lockedEnvId?: string
  presetReleaseId?: string
  onCancel: () => void
  onSubmit: (params: DeployFormSubmit) => void
}

type RuntimeBindingGroupProps = {
  label: string
  bindings: RuntimeBindingDisplay[]
  isLoading: boolean
}

const RuntimeBindingGroup: FC<RuntimeBindingGroupProps> = ({ label, bindings, isLoading }) => {
  const { t } = useTranslation('deployments')

  return (
    <div className="flex items-start gap-3 border-t border-divider-subtle px-3 py-2.5 first:border-t-0">
      <div className="w-36 shrink-0 system-xs-medium-uppercase text-text-tertiary">{label}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {isLoading
          ? <span className="system-sm-regular text-text-quaternary">{t('deployDrawer.loadingBindings')}</span>
          : bindings.length === 0
            ? <span className="system-sm-regular text-text-quaternary">{t('deployDrawer.noBindingRequired')}</span>
            : bindings.map(binding => (
                <div
                  key={`${binding.kind}-${runtimeBindingLabel(binding)}-${runtimeBindingValue(binding)}-${binding.valueType ?? ''}`}
                  className="flex min-w-0 items-center justify-between gap-3"
                >
                  <span className="min-w-0 truncate system-sm-medium text-text-secondary" title={runtimeBindingLabel(binding)}>
                    {runtimeBindingLabel(binding)}
                  </span>
                  <span className="max-w-[240px] truncate rounded-md bg-background-default px-2 py-0.5 font-mono system-xs-medium text-text-tertiary" title={runtimeBindingValue(binding)}>
                    {runtimeBindingValue(binding)}
                  </span>
                </div>
              ))}
      </div>
    </div>
  )
}

export const DeployForm: FC<DeployFormProps> = ({
  appInstanceId,
  environments,
  releases,
  defaultReleaseId,
  lockedEnvId,
  presetReleaseId,
  onCancel,
  onSubmit,
}) => {
  const { t } = useTranslation('deployments')
  const presetRelease = useMemo(
    () => presetReleaseId ? releases.find(r => r.id === presetReleaseId) : undefined,
    [releases, presetReleaseId],
  )
  const displayedRelease = presetRelease ?? (presetReleaseId ? { id: presetReleaseId } : undefined)
  const isPromote = Boolean(presetReleaseId)

  const [selectedEnvId, setSelectedEnvId] = useState<string>(
    () => lockedEnvId ?? environments.find(env => !env.disabled)?.id ?? environments[0]?.id ?? '',
  )
  const selectedEnvironmentId = selectedEnvId || lockedEnvId || environments[0]?.id || ''
  const selectedEnvironment = environments.find(env => env.id === selectedEnvironmentId)
  const [releaseNote, setReleaseNote] = useState<string>('')
  const canDeploy = Boolean(selectedEnvironmentId && selectedEnvironment && !selectedEnvironment.disabled && (!isPromote || displayedRelease?.id || defaultReleaseId))
  const previewReleaseId = isPromote ? displayedRelease?.id ?? defaultReleaseId : undefined
  const releasePreview = useQuery(consoleQuery.enterprise.enterpriseAppDeployConsolePreviewRelease.queryOptions({
    input: appInstanceId && (!isPromote || previewReleaseId)
      ? {
          params: { appInstanceId },
          body: {
            releaseId: previewReleaseId,
          },
        }
      : skipToken,
  }))
  const previewBindings = releasePreview.data?.bindings ?? []
  const modelBindings = previewBindings.filter(isRuntimeModelBinding)
  const pluginBindings = previewBindings.filter(isRuntimePluginBinding)
  const envVarBindings = previewBindings.filter(isRuntimeEnvVarBinding)

  const lockedEnv = lockedEnvId ? environments.find(e => e.id === lockedEnvId) : undefined

  const handleDeploy = () => {
    if (!canDeploy)
      return

    onSubmit({
      environmentId: selectedEnvironmentId,
      releaseId: displayedRelease?.id ?? (isPromote ? defaultReleaseId : undefined),
      releaseNote: isPromote ? undefined : releaseNote,
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <DialogTitle className="title-xl-semi-bold text-text-primary">
          {isPromote ? t('deployDrawer.promoteTitle') : t('deployDrawer.title')}
        </DialogTitle>
        <DialogDescription className="mt-1 system-sm-regular text-text-tertiary">
          {isPromote ? t('deployDrawer.promoteDescription') : t('deployDrawer.description')}
        </DialogDescription>
      </div>

      <Field label={isPromote ? t('deployDrawer.releaseLabel') : t('deployDrawer.noteLabel')}>
        {isPromote && displayedRelease
          ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between rounded-lg border border-components-panel-border bg-components-panel-bg-blur px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 font-mono system-sm-semibold text-text-primary">{releaseLabel(displayedRelease)}</span>
                    <span className="shrink-0 system-xs-regular text-text-tertiary">·</span>
                    <span className="shrink-0 font-mono system-xs-regular text-text-tertiary">{releaseCommit(displayedRelease)}</span>
                    {displayedRelease.description && (
                      <>
                        <span className="shrink-0 system-xs-regular text-text-tertiary">·</span>
                        <span className="truncate system-xs-regular text-text-secondary">{displayedRelease.description}</span>
                      </>
                    )}
                  </div>
                  <span className="shrink-0 system-xs-regular text-text-quaternary">{displayedRelease.createdAt}</span>
                </div>
                <span className="system-xs-regular text-text-tertiary">
                  {t('deployDrawer.existingReleaseHint')}
                </span>
              </div>
            )
          : (
              <div className="flex flex-col gap-2">
                <Input
                  value={releaseNote}
                  onChange={e => setReleaseNote(e.target.value)}
                  placeholder={t('deployDrawer.notePlaceholder')}
                  maxLength={80}
                />
                <span className="system-xs-regular text-text-tertiary">
                  {t('deployDrawer.newReleaseHint')}
                </span>
              </div>
            )}
      </Field>

      <Field
        label={t('deployDrawer.targetEnv')}
        hint={lockedEnvId ? t('deployDrawer.lockedHint') : undefined}
      >
        {lockedEnv
          ? <EnvironmentRow env={lockedEnv} />
          : (
              <DeploymentSelect
                value={selectedEnvironmentId}
                onChange={setSelectedEnvId}
                options={environments.filter(env => env.id).map(env => ({
                  value: env.id!,
                  label: `${environmentName(env)} · ${t(environmentMode(env) === 'isolated' ? 'mode.isolated' : 'mode.shared')} · ${(env.type ?? 'env').toUpperCase()}`,
                  disabled: env.disabled,
                  disabledReason: env.disabledReason,
                }))}
                placeholder={t('deployDrawer.selectEnv')}
              />
            )}
      </Field>

      <div className="overflow-hidden rounded-xl border border-divider-subtle bg-background-default-subtle">
        <div className="flex items-start justify-between gap-3 px-3 py-2.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="system-xs-medium-uppercase text-text-tertiary">{t('deployDrawer.runtimeCredentials')}</div>
            <span className="system-xs-regular text-text-quaternary">{t('deployDrawer.bindingsDisabled')}</span>
          </div>
          <span className="shrink-0 rounded-md bg-background-default px-2 py-0.5 system-xs-medium text-text-tertiary">
            {t('deployDrawer.readOnly')}
          </span>
        </div>
        <RuntimeBindingGroup
          label={t('deployDrawer.modelCreds')}
          bindings={modelBindings}
          isLoading={releasePreview.isFetching}
        />
        <RuntimeBindingGroup
          label={t('deployDrawer.pluginCreds')}
          bindings={pluginBindings}
          isLoading={releasePreview.isFetching}
        />
        <RuntimeBindingGroup
          label={t('deployDrawer.envVars')}
          bindings={envVarBindings}
          isLoading={releasePreview.isFetching}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          {t('deployDrawer.cancel')}
        </Button>
        <Button variant="primary" disabled={!canDeploy} onClick={handleDeploy}>
          {isPromote ? t('deployDrawer.promote') : t('deployDrawer.deploy')}
        </Button>
      </div>
    </div>
  )
}
