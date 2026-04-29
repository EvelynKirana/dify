'use client'

import type { FC } from 'react'
import type { BindingsProto, ConsoleReleaseSummary, EnvironmentOption } from '@/contract/console/deployments'
import { Button } from '@langgenius/dify-ui/button'
import { DialogDescription, DialogTitle } from '@langgenius/dify-ui/dialog'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '@/app/components/base/input'
import { consoleQuery } from '@/service/client'
import { environmentMode, environmentName, releaseCommit, releaseLabel } from '../../utils'
import {
  credentialValue,
  deploymentBindings,
  deriveRequiredBindings,
  envVarValue,
} from './bindings'
import {
  DeploymentSelect,
  EnvironmentRow,
  Field,
  LabeledSelect,
} from './select'

export type DeployFormSubmit = {
  environmentId: string
  releaseId?: string
  releaseNote?: string
  bindings?: BindingsProto
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
  const isPromote = Boolean(presetRelease)

  const [selectedEnvId, setSelectedEnvId] = useState<string>(
    () => lockedEnvId ?? environments[0]?.id ?? '',
  )
  const selectedEnvironmentId = selectedEnvId || lockedEnvId || environments[0]?.id || ''
  const planReleaseId = presetRelease?.id ?? defaultReleaseId ?? releases[0]?.id
  const deploymentPlan = useQuery(consoleQuery.deployments.deploymentPlan.queryOptions({
    input: selectedEnvironmentId && planReleaseId
      ? {
          params: {
            appId,
            environmentId: selectedEnvironmentId,
            releaseId: planReleaseId,
          },
        }
      : skipToken,
  }))
  const required = useMemo(() => deriveRequiredBindings(deploymentPlan.data?.slots), [deploymentPlan.data?.slots])
  const [releaseNote, setReleaseNote] = useState<string>('')
  const [modelCredentials, setModelCredentials] = useState<Record<string, string>>({})
  const [pluginCredentials, setPluginCredentials] = useState<Record<string, string>>({})
  const [envValues, setEnvValues] = useState<Record<string, string>>({})

  const canDeploy = Boolean(
    selectedEnvironmentId
    && deploymentPlan.data?.canDeploy !== false
    && !deploymentPlan.isFetching
    && required.model.every(item => !item.required || credentialValue(modelCredentials, item))
    && required.plugin.every(item => !item.required || credentialValue(pluginCredentials, item))
    && required.envVars.every(item => !item.required || envVarValue(envValues, item)),
  )

  const lockedEnv = lockedEnvId ? environments.find(e => e.id === lockedEnvId) : undefined

  const handleDeploy = () => {
    if (!canDeploy)
      return

    onSubmit({
      environmentId: selectedEnvironmentId,
      releaseId: presetRelease?.id,
      releaseNote: isPromote ? undefined : releaseNote,
      bindings: deploymentBindings(required, modelCredentials, pluginCredentials, envValues),
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
        {isPromote && presetRelease
          ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between rounded-lg border border-components-panel-border bg-components-panel-bg-blur px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 font-mono system-sm-semibold text-text-primary">{releaseLabel(presetRelease)}</span>
                    <span className="shrink-0 system-xs-regular text-text-tertiary">·</span>
                    <span className="shrink-0 font-mono system-xs-regular text-text-tertiary">{releaseCommit(presetRelease)}</span>
                    {presetRelease.description && (
                      <>
                        <span className="shrink-0 system-xs-regular text-text-tertiary">·</span>
                        <span className="truncate system-xs-regular text-text-secondary">{presetRelease.description}</span>
                      </>
                    )}
                  </div>
                  <span className="shrink-0 system-xs-regular text-text-quaternary">{presetRelease.createdAt}</span>
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

      {(required.model.length > 0 || required.plugin.length > 0) && (
        <div className="flex flex-col gap-4">
          <div className="system-xs-medium-uppercase text-text-tertiary">{t('deployDrawer.runtimeCredentials')}</div>
          {required.model.length > 0 && (
            <Field label={t('deployDrawer.modelCreds')}>
              <div className="flex flex-col gap-2">
                {required.model.map(item => (
                  <LabeledSelect
                    key={item.slot}
                    label={item.label}
                    value={credentialValue(modelCredentials, item)}
                    onChange={v => setModelCredentials(prev => ({ ...prev, [item.slot]: v }))}
                    options={item.options.map(option => ({
                      value: option.id,
                      label: option.label,
                    }))}
                    placeholder={t('deployDrawer.selectProviderKey', { provider: item.label })}
                  />
                ))}
              </div>
            </Field>
          )}

          {required.plugin.length > 0 && (
            <Field label={t('deployDrawer.pluginCreds')}>
              <div className="flex flex-col gap-2">
                {required.plugin.map(item => (
                  <LabeledSelect
                    key={item.slot}
                    label={item.label}
                    value={credentialValue(pluginCredentials, item)}
                    onChange={v => setPluginCredentials(prev => ({ ...prev, [item.slot]: v }))}
                    options={item.options.map(option => ({ value: option.id, label: option.label }))}
                    placeholder={t('deployDrawer.selectProviderCred', { provider: item.label })}
                  />
                ))}
              </div>
            </Field>
          )}
        </div>
      )}

      {required.envVars.length > 0 && (
        <Field label={t('deployDrawer.envVars')}>
          <div className="flex flex-col gap-2">
            {required.envVars.map(v => (
              <div key={v.key} className="flex items-center gap-2">
                <span className="w-20 shrink-0 system-xs-medium text-text-secondary">{v.label}</span>
                <div className="min-w-0 flex-1">
                  <DeploymentSelect
                    value={envVarValue(envValues, v)}
                    onChange={next => setEnvValues(prev => ({ ...prev, [v.key]: next }))}
                    options={v.options.map(option => ({ value: option.id, label: option.label }))}
                    placeholder={t('deployDrawer.defaultSelect')}
                  />
                </div>
              </div>
            ))}
          </div>
        </Field>
      )}

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
