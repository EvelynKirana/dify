'use client'

import type { DeploymentBindingOptionSlot, DeploymentRuntimeBinding, ReleaseRow, RuntimeInstanceRow } from '@dify/contracts/enterprise/types.gen'
import type { EnvironmentOption } from '@/features/deployments/types'
import { Button } from '@langgenius/dify-ui/button'
import { DialogDescription, DialogTitle } from '@langgenius/dify-ui/dialog'
import { toast } from '@langgenius/dify-ui/toast'
import { skipToken, useMutation, useQuery } from '@tanstack/react-query'
import { useSetAtom } from 'jotai'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { consoleQuery } from '@/service/client'
import { closeDeployDrawerAtom } from '../../store'
import {
  activeRelease,
  environmentId,
  environmentMode,
  environmentName,
  releaseCommit,
  releaseDeploymentAction,
  releaseLabel,
} from '../../utils'
import {
  DeploymentSelect,
  EnvironmentRow,
  Field,
} from './select'

type DeployFormProps = {
  appInstanceId: string
  environments: EnvironmentOption[]
  releases: ReleaseRow[]
  deploymentRows: RuntimeInstanceRow[]
  defaultReleaseId?: string
  lockedEnvId?: string
  presetReleaseId?: string
}

type BindingSelections = Record<string, string>

type BindingSelectOption = {
  value: string
  label: string
}

type BindingOptionsPanelProps = {
  slots: DeploymentBindingOptionSlot[]
  selections: BindingSelections
  isLoading: boolean
  hasError: boolean
  onChange: (slot: string, value: string) => void
}

function isEnvBindingSlot(slot: DeploymentBindingOptionSlot) {
  return (slot.kind?.toLowerCase() ?? '').includes('env')
}

function bindingSlotKey(slot: DeploymentBindingOptionSlot) {
  return slot.slot ?? ''
}

function bindingCandidateOptions(slot: DeploymentBindingOptionSlot): BindingSelectOption[] {
  if (isEnvBindingSlot(slot)) {
    return (slot.envVarCandidates ?? [])
      .filter(candidate => candidate.envVarId)
      .map(candidate => ({
        value: candidate.envVarId!,
        label: [
          candidate.name,
          candidate.displayValue,
        ].filter(Boolean).join(' · ') || candidate.envVarId!,
      }))
  }

  return (slot.candidates ?? [])
    .filter(candidate => candidate.credentialId)
    .map(candidate => ({
      value: candidate.credentialId!,
      label: [
        candidate.displayName,
        candidate.pluginName || candidate.pluginId,
        candidate.pluginVersion,
      ].filter(Boolean).join(' · ') || candidate.credentialId!,
    }))
}

function hasMissingRequiredBinding(slot: DeploymentBindingOptionSlot, selectedValue?: string) {
  return Boolean(slot.required && !selectedValue)
}

function selectedDeploymentBindings(slots: DeploymentBindingOptionSlot[], selections: BindingSelections): DeploymentRuntimeBinding[] {
  return slots
    .map((slot): DeploymentRuntimeBinding | undefined => {
      const slotKey = bindingSlotKey(slot)
      const selectedValue = selections[slotKey]
      if (!slotKey || !selectedValue)
        return undefined

      return isEnvBindingSlot(slot)
        ? { slot: slotKey, envVarId: selectedValue }
        : { slot: slotKey, credentialId: selectedValue }
    })
    .filter((binding): binding is DeploymentRuntimeBinding => Boolean(binding))
}

function selectedBindingSelections(slots: DeploymentBindingOptionSlot[], manualBindings: BindingSelections): BindingSelections {
  const next: BindingSelections = {}
  for (const slot of slots) {
    const slotKey = bindingSlotKey(slot)
    const candidates = bindingCandidateOptions(slot)
    const existing = manualBindings[slotKey]
    if (existing && candidates.some(candidate => candidate.value === existing))
      next[slotKey] = existing
    else if (candidates.length === 1 && candidates[0])
      next[slotKey] = candidates[0].value
  }
  return next
}

function BindingOptionsPanel({
  slots,
  selections,
  isLoading,
  hasError,
  onChange,
}: BindingOptionsPanelProps) {
  const { t } = useTranslation('deployments')

  if (isLoading) {
    return (
      <div className="rounded-xl border border-divider-subtle bg-background-default-subtle px-3 py-4 system-sm-regular text-text-quaternary">
        {t('deployDrawer.loadingBindings')}
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="rounded-xl border border-divider-subtle bg-background-default-subtle px-3 py-4 system-sm-regular text-text-destructive">
        {t('deployDrawer.bindingOptionsFailed')}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-divider-subtle bg-background-default-subtle">
      <div className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5">
        <div className="system-xs-medium-uppercase text-text-tertiary">{t('deployDrawer.runtimeCredentials')}</div>
        <span className="system-xs-regular text-text-quaternary">{t('deployDrawer.bindingSelectionHint')}</span>
      </div>
      {slots.length === 0
        ? (
            <div className="border-t border-divider-subtle px-3 py-3 system-sm-regular text-text-quaternary">
              {t('deployDrawer.noBindingRequired')}
            </div>
          )
        : slots.map((slot) => {
            const slotKey = bindingSlotKey(slot)
            const candidates = bindingCandidateOptions(slot)
            const selectedValue = selections[slotKey] ?? ''
            const missing = hasMissingRequiredBinding(slot, selectedValue)
            return (
              <div key={slotKey} className="flex flex-col gap-2 border-t border-divider-subtle px-3 py-3">
                <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.9fr)] sm:items-start">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate system-sm-medium text-text-secondary" title={slot.label || slotKey}>
                        {slot.label || slotKey}
                      </span>
                      {slot.required && (
                        <span className="shrink-0 rounded-md bg-background-default px-1.5 py-0.5 system-2xs-medium-uppercase text-text-tertiary">
                          {t('deployDrawer.requiredBinding')}
                        </span>
                      )}
                    </div>
                    <span className="font-mono system-xs-regular break-all text-text-quaternary" title={slotKey}>
                      {slotKey}
                    </span>
                  </div>
                  {candidates.length === 0
                    ? (
                        <div className="rounded-lg border border-divider-subtle bg-background-default px-2 py-1.5 system-sm-regular text-text-quaternary">
                          {t('deployDrawer.noCredentialCandidates')}
                        </div>
                      )
                    : (
                        <DeploymentSelect
                          value={selectedValue}
                          onChange={value => onChange(slotKey, value)}
                          options={candidates}
                          placeholder={t('deployDrawer.selectCredential')}
                        />
                      )}
                </div>
                {missing && (
                  <div className="system-xs-regular text-text-destructive">
                    {t('deployDrawer.missingRequiredBinding')}
                  </div>
                )}
              </div>
            )
          })}
    </div>
  )
}

export function DeployForm({
  appInstanceId,
  environments,
  releases,
  deploymentRows,
  defaultReleaseId,
  lockedEnvId,
  presetReleaseId,
}: DeployFormProps) {
  const { t } = useTranslation('deployments')
  const closeDeployDrawer = useSetAtom(closeDeployDrawerAtom)
  const startDeploy = useMutation(consoleQuery.enterprise.appDeploy.createDeployment.mutationOptions())
  const presetRelease = presetReleaseId ? releases.find(r => r.id === presetReleaseId) : undefined
  const displayedRelease: ReleaseRow | undefined = presetRelease ?? (presetReleaseId ? { id: presetReleaseId } : undefined)
  const isExistingRelease = Boolean(presetReleaseId)

  const [selectedEnvId, setSelectedEnvId] = useState<string>(
    () => lockedEnvId ?? environments.find(env => !env.disabled)?.id ?? environments[0]?.id ?? '',
  )
  const selectedEnvironmentId = selectedEnvId || lockedEnvId || environments[0]?.id || ''
  const selectedEnvironment = environments.find(env => env.id === selectedEnvironmentId)
  const [selectedReleaseId, setSelectedReleaseId] = useState<string>(
    () => displayedRelease?.id ?? defaultReleaseId ?? '',
  )
  const selectedRelease = releases.find(release => release.id === selectedReleaseId)
  const targetReleaseId = displayedRelease?.id ?? selectedRelease?.id ?? selectedReleaseId
  const targetRelease = displayedRelease ?? selectedRelease ?? (targetReleaseId ? { id: targetReleaseId } : undefined)
  const selectedDeploymentRow = deploymentRows.find(row => environmentId(row.environment) === selectedEnvironmentId)
  const action = releaseDeploymentAction({
    targetRelease,
    currentRelease: activeRelease(selectedDeploymentRow),
    releaseRows: releases,
    isExistingRelease,
  })
  const bindingOptions = useQuery(consoleQuery.enterprise.appDeploy.listDeploymentBindingOptions.queryOptions({
    input: appInstanceId && targetReleaseId
      ? {
          params: { appInstanceId },
          query: {
            releaseId: targetReleaseId,
          },
        }
      : skipToken,
  }))
  const bindingSlots = bindingOptions.data?.slots?.filter(slot => slot.slot) ?? []
  const [manualBindings, setManualBindings] = useState<BindingSelections>({})
  const selectedBindings = selectedBindingSelections(bindingSlots, manualBindings)
  const deploymentBindings = selectedDeploymentBindings(bindingSlots, selectedBindings)
  const bindingOptionsLoading = Boolean(targetReleaseId && (bindingOptions.isLoading || bindingOptions.isFetching))
  const bindingOptionsReady = Boolean(targetReleaseId && bindingOptions.data && !bindingOptionsLoading && !bindingOptions.isError)
  const requiredBindingsReady = bindingSlots.every(slot => !hasMissingRequiredBinding(slot, selectedBindings[bindingSlotKey(slot)]))
  const isSubmitting = startDeploy.isPending
  const canDeploy = Boolean(
    selectedEnvironmentId
    && selectedEnvironment
    && !selectedEnvironment.disabled
    && targetReleaseId
    && bindingOptionsReady
    && requiredBindingsReady
    && !isSubmitting,
  )

  const lockedEnv = lockedEnvId ? environments.find(e => e.id === lockedEnvId) : undefined
  const actionTitle = action === 'rollback'
    ? t('deployDrawer.rollbackTitle')
    : action === 'promote'
      ? t('deployDrawer.promoteTitle')
      : action === 'deployExistingRelease'
        ? t('deployDrawer.deployExistingReleaseTitle')
        : t('deployDrawer.title')
  const actionDescription = action === 'rollback'
    ? t('deployDrawer.rollbackDescription')
    : action === 'promote'
      ? t('deployDrawer.promoteDescription')
      : action === 'deployExistingRelease'
        ? t('deployDrawer.deployExistingReleaseDescription')
        : t('deployDrawer.description')
  const submitLabel = isSubmitting
    ? t('deployDrawer.deploying')
    : action === 'rollback'
      ? t('deployDrawer.rollback')
      : action === 'promote'
        ? t('deployDrawer.promote')
        : action === 'deployExistingRelease'
          ? t('deployDrawer.deployExistingRelease')
          : t('deployDrawer.deploy')

  const handleDeploy = () => {
    if (!canDeploy || !targetReleaseId)
      return

    void (async () => {
      try {
        await startDeploy.mutateAsync({
          params: {
            appInstanceId,
          },
          body: {
            environmentId: selectedEnvironmentId,
            releaseId: targetReleaseId,
            bindings: deploymentBindings,
          },
        })
        closeDeployDrawer()
      }
      catch {
        toast.error(t('deployDrawer.deployFailed'))
      }
    })()
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <DialogTitle className="title-xl-semi-bold text-text-primary">
          {actionTitle}
        </DialogTitle>
        <DialogDescription className="mt-1 system-sm-regular text-text-tertiary">
          {actionDescription}
        </DialogDescription>
      </div>

      <Field label={t('deployDrawer.releaseLabel')}>
        {isExistingRelease && displayedRelease
          ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between rounded-lg border border-components-panel-border bg-components-panel-bg-blur px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 font-mono system-sm-semibold text-text-primary">{releaseLabel(displayedRelease)}</span>
                    <span className="shrink-0 system-xs-regular text-text-tertiary">·</span>
                    <span className="shrink-0 font-mono system-xs-regular text-text-tertiary">{releaseCommit(displayedRelease)}</span>
                  </div>
                  <span className="shrink-0 system-xs-regular text-text-quaternary">{displayedRelease.createdAt}</span>
                </div>
                <span className="system-xs-regular text-text-tertiary">
                  {t('deployDrawer.existingReleaseHint')}
                </span>
              </div>
            )
          : releases.length === 0
            ? (
                <div className="rounded-lg border border-dashed border-components-panel-border bg-components-panel-bg-blur px-3 py-3 system-sm-regular text-text-tertiary">
                  {t('deployDrawer.noReleaseAvailable')}
                </div>
              )
            : (
                <DeploymentSelect
                  value={selectedReleaseId}
                  onChange={setSelectedReleaseId}
                  options={releases.filter(release => release.id).map(release => ({
                    value: release.id!,
                    label: `${releaseLabel(release)} · ${releaseCommit(release)}`,
                  }))}
                  placeholder={t('deployDrawer.selectRelease')}
                />
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

      {targetReleaseId && (
        <BindingOptionsPanel
          slots={bindingSlots}
          selections={selectedBindings}
          isLoading={bindingOptionsLoading}
          hasError={bindingOptions.isError}
          onChange={(slot, value) => setManualBindings(prev => ({ ...prev, [slot]: value }))}
        />
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={closeDeployDrawer}>
          {t('deployDrawer.cancel')}
        </Button>
        <Button variant="primary" disabled={!canDeploy} onClick={handleDeploy}>
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}
