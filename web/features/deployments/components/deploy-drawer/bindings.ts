import type { BindingsProto, DeploymentSlot } from '@/contract/console/deployments'

export type CredentialRequirement = {
  slot: string
  label: string
  required: boolean
  selectedCredentialId?: string
  options: { id: string, label: string }[]
}

export type EnvVarRequirement = {
  key: string
  label: string
  required: boolean
  selectedEnvVarId?: string
  type: 'string' | 'secret'
  options: { id: string, label: string }[]
}

export type RequiredBindings = {
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

export function deriveRequiredBindings(slots: DeploymentSlot[] | undefined): RequiredBindings {
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

export function credentialValue(values: Record<string, string>, item: CredentialRequirement) {
  return values[item.slot] || item.selectedCredentialId || item.options[0]?.id || ''
}

export function envVarValue(values: Record<string, string>, item: EnvVarRequirement) {
  return values[item.key] || item.selectedEnvVarId || item.options[0]?.id || ''
}

export function deploymentBindings(
  required: RequiredBindings,
  modelCredentials: Record<string, string>,
  pluginCredentials: Record<string, string>,
  envValues: Record<string, string>,
): BindingsProto {
  return {
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
}
