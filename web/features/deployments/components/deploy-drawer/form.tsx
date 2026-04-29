'use client'

import type { FC } from 'react'
import type { ConsoleReleaseSummary, EnvironmentOption, RuntimeBindingDisplay } from '@/contract/console/deployments'
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
  appId: string
  environments: EnvironmentOption[]
  releases: ConsoleReleaseSummary[]
  defaultReleaseId?: string
  lockedEnvId?: string
  presetReleaseId?: string
  onCancel: () => void
  onSubmit: (params: DeployFormSubmit) => void
}

type DisabledBindingControlProps = {
  label: string
  placeholder: string
}

const DisabledBindingControl: FC<DisabledBindingControlProps> = ({ label, placeholder }) => (
  <div className="flex items-center gap-2">
    <span className="w-20 shrink-0 system-xs-medium text-text-secondary">{label}</span>
    <button
      type="button"
      disabled
      className="flex h-8 min-w-0 flex-1 cursor-not-allowed items-center justify-between rounded-lg border-[0.5px] border-components-input-border-active bg-components-input-bg-normal px-2 system-sm-medium text-text-quaternary opacity-60"
    >
      <span className="truncate">{placeholder}</span>
      <span className="i-ri-arrow-down-s-line h-4 w-4 shrink-0 text-text-quaternary" />
    </button>
  </div>
)

type DisabledBindingGroupProps = {
  label: string
  placeholder: string
  bindings: RuntimeBindingDisplay[]
  isLoading: boolean
}

const DisabledBindingGroup: FC<DisabledBindingGroupProps> = ({ label, placeholder, bindings, isLoading }) => {
  if (bindings.length === 0) {
    return (
      <DisabledBindingControl
        label={label}
        placeholder={isLoading ? placeholder : '—'}
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {bindings.map(binding => (
        <DisabledBindingControl
          key={`${binding.kind}-${runtimeBindingLabel(binding)}-${runtimeBindingValue(binding)}-${binding.valueType ?? ''}`}
          label={runtimeBindingLabel(binding)}
          placeholder={runtimeBindingValue(binding)}
        />
      ))}
    </div>
  )
}

export const DeployForm: FC<DeployFormProps> = ({
  appId,
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
    () => lockedEnvId ?? environments[0]?.id ?? '',
  )
  const selectedEnvironmentId = selectedEnvId || lockedEnvId || environments[0]?.id || ''
  const [releaseNote, setReleaseNote] = useState<string>('')
  const canDeploy = Boolean(selectedEnvironmentId && (!isPromote || displayedRelease?.id || defaultReleaseId))
  const previewReleaseId = isPromote ? displayedRelease?.id ?? defaultReleaseId : undefined
  const releasePreview = useQuery(consoleQuery.deployments.previewRelease.queryOptions({
    input: appId && (!isPromote || previewReleaseId)
      ? {
          params: { appInstanceId: appId },
          body: {
            releaseId: previewReleaseId,
          },
        }
      : skipToken,
    staleTime: 30 * 1000,
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
                }))}
                placeholder={t('deployDrawer.selectEnv')}
              />
            )}
      </Field>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="system-xs-medium-uppercase text-text-tertiary">{t('deployDrawer.runtimeCredentials')}</div>
          <span className="system-xs-regular text-text-quaternary">{t('deployDrawer.bindingsDisabled')}</span>
        </div>
        <Field label={t('deployDrawer.modelCreds')}>
          <DisabledBindingGroup
            label={t('deployDrawer.modelCreds')}
            placeholder={t('deployDrawer.defaultSelect')}
            bindings={modelBindings}
            isLoading={releasePreview.isFetching}
          />
        </Field>
        <Field label={t('deployDrawer.pluginCreds')}>
          <DisabledBindingGroup
            label={t('deployDrawer.pluginCreds')}
            placeholder={t('deployDrawer.defaultSelect')}
            bindings={pluginBindings}
            isLoading={releasePreview.isFetching}
          />
        </Field>
        <Field label={t('deployDrawer.envVars')}>
          <DisabledBindingGroup
            label={t('deployDrawer.envVars')}
            placeholder={t('deployDrawer.defaultSelect')}
            bindings={envVarBindings}
            isLoading={releasePreview.isFetching}
          />
        </Field>
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
