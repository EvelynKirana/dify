'use client'
import type { FC } from 'react'
import type { BindingsProto, ConsoleReleaseSummary, DeploymentSlot, EnvironmentOption } from '@/contract/console/deployments'
import { Button } from '@langgenius/dify-ui/button'
import { cn } from '@langgenius/dify-ui/cn'
import { Dialog, DialogCloseButton, DialogContent, DialogDescription, DialogTitle } from '@langgenius/dify-ui/dialog'
import { Select, SelectContent, SelectItem, SelectItemIndicator, SelectItemText, SelectTrigger } from '@langgenius/dify-ui/select'
import { skipToken, useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '@/app/components/base/input'
import { consoleQuery } from '@/service/client'
import { deploymentAppDataQueryOptions } from '@/service/deployments'
import { useDeploymentsStore } from '../store'
import { environmentHealth, environmentMode, environmentName, releaseCommit, releaseLabel } from '../utils'
import { HealthBadge, ModeBadge } from './status-badge'

type CredentialRequirement = {
  slot: string
  label: string
  required: boolean
  selectedCredentialId?: string
  options: { id: string, label: string }[]
}

type EnvVarRequirement = {
  key: string
  label: string
  required: boolean
  selectedEnvVarId?: string
  type: 'string' | 'secret'
  options: { id: string, label: string }[]
}

type RequiredBindings = {
  model: CredentialRequirement[]
  plugin: CredentialRequirement[]
  envVars: EnvVarRequirement[]
}

function isModelSlot(kind?: string) {
  return kind?.toLowerCase().includes('model')
}

function isEnvVarSlot(kind?: string) {
  const normalized = kind?.toLowerCase() ?? ''
  return normalized.includes('env')
}

function isSecretValue(type?: string) {
  return type?.toLowerCase().includes('secret') ?? false
}

function deriveRequiredBindings(slots: DeploymentSlot[] | undefined): RequiredBindings {
  const required: RequiredBindings = {
    model: [],
    plugin: [],
    envVars: [],
  }

  slots?.forEach((slot) => {
    const slotName = slot.slot || slot.label
    if (!slotName)
      return

    if (isEnvVarSlot(slot.kind)) {
      required.envVars.push({
        key: slotName,
        label: slot.label || slotName,
        required: slot.required ?? true,
        selectedEnvVarId: slot.selectedEnvVarId,
        type: isSecretValue(slot.envVarOptions?.[0]?.valueType) ? 'secret' : 'string',
        options: slot.envVarOptions
          ?.filter(option => option.id)
          .map(option => ({
            id: option.id!,
            label: `${option.name || option.id}${option.maskedValue ? ` · ${option.maskedValue}` : ''}`,
          })) ?? [],
      })
      return
    }

    const target = isModelSlot(slot.kind) ? required.model : required.plugin
    target.push({
      slot: slotName,
      label: slot.label || slotName,
      required: slot.required ?? true,
      selectedCredentialId: slot.selectedCredentialId,
      options: slot.credentialOptions
        ?.filter(option => option.id)
        .map(option => ({
          id: option.id!,
          label: option.displayName || option.provider || option.id!,
        })) ?? [],
    })
  })

  return required
}

function credentialValue(values: Record<string, string>, item: CredentialRequirement) {
  return values[item.slot] || item.selectedCredentialId || item.options[0]?.id || ''
}

function envVarValue(values: Record<string, string>, item: EnvVarRequirement) {
  return values[item.key] || item.selectedEnvVarId || item.options[0]?.id || ''
}

type FieldProps = {
  label: string
  hint?: string
  children: React.ReactNode
}

const Field: FC<FieldProps> = ({ label, hint, children }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <div className="system-xs-medium-uppercase text-text-tertiary">{label}</div>
      {hint && <span className="system-xs-regular text-text-quaternary">{hint}</span>}
    </div>
    {children}
  </div>
)

type SelectOption = { value: string, label: string }

type SelectProps = {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
}

const DeploymentSelect: FC<SelectProps> = ({ value, onChange, options, placeholder }) => {
  const { t } = useTranslation('deployments')
  const selectedOption = useMemo(
    () => options.find(option => option.value === value),
    [options, value],
  )

  return (
    <Select
      value={value || null}
      onValueChange={(next) => {
        if (!next)
          return
        onChange(next)
      }}
      disabled={options.length === 0}
    >
      <SelectTrigger
        className={cn(
          'h-8 border-[0.5px] border-components-input-border-active px-2 system-sm-medium',
          !selectedOption && 'text-text-quaternary',
        )}
      >
        {selectedOption?.label ?? placeholder ?? t('deployDrawer.defaultSelect')}
      </SelectTrigger>
      <SelectContent popupClassName="w-(--anchor-width)">
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            <SelectItemText>{opt.label}</SelectItemText>
            <SelectItemIndicator />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

type LabeledSelectProps = SelectProps & { label: string }

const LabeledSelect: FC<LabeledSelectProps> = ({ label, ...rest }) => (
  <div className="flex items-center gap-2">
    <span className="w-20 shrink-0 system-xs-medium text-text-secondary">{label}</span>
    <div className="min-w-0 flex-1">
      <DeploymentSelect {...rest} />
    </div>
  </div>
)

type EnvironmentRowProps = { env: EnvironmentOption }

const EnvironmentRow: FC<EnvironmentRowProps> = ({ env }) => (
  <div className="flex items-center justify-between rounded-lg border border-components-panel-border bg-components-panel-bg-blur px-3 py-2">
    <div className="flex items-center gap-2">
      <span className="system-sm-semibold text-text-primary">{environmentName(env)}</span>
      <ModeBadge mode={environmentMode(env)} />
      <HealthBadge health={environmentHealth(env)} />
    </div>
    <span className="system-xs-regular text-text-tertiary uppercase">{env.type ?? 'env'}</span>
  </div>
)

type DeployFormProps = {
  appId: string
  environments: EnvironmentOption[]
  releases: ConsoleReleaseSummary[]
  defaultReleaseId?: string
  lockedEnvId?: string
  presetReleaseId?: string
  onCancel: () => void
  onSubmit: (params: {
    environmentId: string
    releaseId?: string
    releaseNote?: string
    bindings?: BindingsProto
  }) => void
}

const DeployForm: FC<DeployFormProps> = ({
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
    const bindings: BindingsProto = {
      models: required.model.map(item => ({
        slot: item.slot,
        credentialId: credentialValue(modelCredentials, item),
      })),
      plugins: required.plugin.map(item => ({
        slot: item.slot,
        credentialId: credentialValue(pluginCredentials, item),
      })),
      envVars: required.envVars.map(item => ({
        slot: item.key,
        envVarId: envVarValue(envValues, item),
      })),
    }
    onSubmit({
      environmentId: selectedEnvironmentId,
      releaseId: presetRelease?.id,
      releaseNote: isPromote ? undefined : releaseNote,
      bindings,
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
                {required.model.map((item) => {
                  return (
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
                  )
                })}
              </div>
            </Field>
          )}

          {required.plugin.length > 0 && (
            <Field label={t('deployDrawer.pluginCreds')}>
              <div className="flex flex-col gap-2">
                {required.plugin.map((item) => {
                  return (
                    <LabeledSelect
                      key={item.slot}
                      label={item.label}
                      value={credentialValue(pluginCredentials, item)}
                      onChange={v => setPluginCredentials(prev => ({ ...prev, [item.slot]: v }))}
                      options={item.options.map(option => ({ value: option.id, label: option.label }))}
                      placeholder={t('deployDrawer.selectProviderCred', { provider: item.label })}
                    />
                  )
                })}
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

const DeployDrawer: FC = () => {
  const { t } = useTranslation('deployments')
  const drawer = useDeploymentsStore(state => state.deployDrawer)
  const drawerAppId = drawer.appId
  const storedAppData = useDeploymentsStore(state => drawerAppId ? state.appData[drawerAppId] : undefined)
  const applyAppData = useDeploymentsStore(state => state.applyAppData)
  const closeDeployDrawer = useDeploymentsStore(state => state.closeDeployDrawer)
  const startDeploy = useDeploymentsStore(state => state.startDeploy)

  const open = drawer.open
  const appDataQuery = useQuery({
    ...deploymentAppDataQueryOptions(drawerAppId ?? ''),
    enabled: open && Boolean(drawerAppId) && !storedAppData,
  })
  useEffect(() => {
    if (appDataQuery.data)
      applyAppData(appDataQuery.data)
  }, [appDataQuery.data, applyAppData])

  const appData = storedAppData ?? (appDataQuery.data?.appId === drawerAppId ? appDataQuery.data : undefined)
  const environments = appData?.candidates.environmentOptions ?? []
  const releases = appData?.candidates.releases ?? []
  const defaultReleaseId = appData?.candidates.defaultReleaseId
  const formKey = `${drawer.appId ?? 'none'}-${drawer.environmentId ?? 'any'}-${drawer.releaseId ?? 'new'}-${open ? '1' : '0'}`

  return (
    <Dialog
      open={open}
      onOpenChange={next => !next && closeDeployDrawer()}
    >
      <DialogContent className="w-[560px] max-w-[90vw]">
        <DialogCloseButton />
        {!drawerAppId
          ? <div className="p-4 text-text-tertiary">{t('deployDrawer.notFound')}</div>
          : !appData
              ? (
                  <div className="flex items-center gap-2 p-4 system-sm-regular text-text-tertiary">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-components-panel-border border-t-transparent" />
                    {t('createModal.loadingApps')}
                  </div>
                )
              : (
                  <DeployForm
                    key={formKey}
                    appId={drawerAppId}
                    environments={environments}
                    releases={releases}
                    defaultReleaseId={defaultReleaseId}
                    lockedEnvId={drawer.environmentId}
                    presetReleaseId={drawer.releaseId}
                    onCancel={closeDeployDrawer}
                    onSubmit={({ environmentId, releaseId, releaseNote, bindings }) =>
                      startDeploy({
                        appId: drawerAppId,
                        environmentId,
                        releaseId,
                        releaseNote,
                        bindings,
                      })}
                  />
                )}
      </DialogContent>
    </Dialog>
  )
}

export default DeployDrawer
