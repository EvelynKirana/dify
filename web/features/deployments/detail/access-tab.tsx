'use client'
import type { FC, ReactNode } from 'react'
import type { AccessPermissionKind } from '../types'
import type {
  AccessPolicyDetail,
  AccessSubject,
  AccessSubjectDisplay,
  APIToken,
  ConsoleEnvironmentSummary,
  DeveloperAPIKeySummary,
  EffectivePolicySummary,
} from '@/contract/console/deployments'
import { cn } from '@langgenius/dify-ui/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@langgenius/dify-ui/popover'
import { Switch } from '@langgenius/dify-ui/switch'
import { toast } from '@langgenius/dify-ui/toast'
import { skipToken, useQueries, useQuery } from '@tanstack/react-query'
import { useDebounce } from 'ahooks'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { consoleQuery } from '@/service/client'
import { useDeploymentsStore } from '../store'
import {
  accessModeToPermissionKey,
  deployedRows,
  environmentName,
  permissionKeyToAccessMode,
  webappUrl,
} from '../utils'

type SectionProps = {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

const Section: FC<SectionProps> = ({ title, description, action, children }) => (
  <div className="flex flex-col gap-3 rounded-xl border border-components-panel-border bg-components-panel-bg p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="system-sm-semibold text-text-primary">{title}</div>
        {description && (
          <p className="mt-1 max-w-xl system-xs-regular text-text-tertiary">{description}</p>
        )}
      </div>
      {action}
    </div>
    {children}
  </div>
)

type CopyPillProps = {
  label: string
  value: string
  prefix?: ReactNode
  className?: string
}

const CopyPill: FC<CopyPillProps> = ({ label, value, prefix, className }) => {
  const { t } = useTranslation('deployments')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(t('access.copyToast'))
      window.setTimeout(() => setCopied(false), 1500)
    }
    catch {
      toast.error(t('access.copyFailed'))
    }
  }

  return (
    <div
      className={cn(
        'flex h-8 items-center rounded-lg border-[0.5px] border-components-input-border-active bg-components-input-bg-normal pr-1 pl-1.5',
        className,
      )}
    >
      <div className="mr-0.5 flex h-5 shrink-0 items-center rounded-md border border-divider-subtle px-1.5 text-[11px] font-medium text-text-tertiary">
        {label}
      </div>
      {prefix}
      <div className="min-w-0 flex-1 truncate px-1 font-mono text-[13px] font-medium text-text-secondary">
        {value}
      </div>
      <div className="mx-1 h-[14px] w-px shrink-0 bg-divider-regular" />
      <button
        type="button"
        onClick={handleCopy}
        aria-label={t('access.copy')}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-state-base-hover hover:text-text-secondary"
      >
        <span className={cn(copied ? 'i-ri-check-line' : 'i-ri-file-copy-line', 'h-3.5 w-3.5')} />
      </button>
    </div>
  )
}

type ApiKeyRowProps = {
  apiKey: DeveloperAPIKeySummary
  onRevoke: () => void
}

const ApiKeyRow: FC<ApiKeyRowProps> = ({ apiKey, onRevoke }) => {
  const { t } = useTranslation('deployments')
  const [copied, setCopied] = useState(false)
  const displayValue = apiKey.maskedPrefix || apiKey.id || '—'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayValue)
      setCopied(true)
      toast.success(t('access.copyToast'))
      window.setTimeout(() => setCopied(false), 1500)
    }
    catch {
      toast.error(t('access.copyFailed'))
    }
  }

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex min-w-[140px] flex-col">
        <span className="system-sm-medium text-text-primary">{apiKey.name || apiKey.id}</span>
        <span className="system-xs-regular text-text-tertiary">
          {t('access.api.envPrefix', { env: apiKey.environmentName || apiKey.environmentId })}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg border-[0.5px] border-components-input-border-active bg-components-input-bg-normal pr-1 pl-2">
        <div className="min-w-0 flex-1 truncate font-mono text-[13px] font-medium text-text-secondary">
          {displayValue}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={t('access.copy')}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-state-base-hover hover:text-text-secondary"
        >
          <span className={cn(copied ? 'i-ri-check-line' : 'i-ri-file-copy-line', 'h-3.5 w-3.5')} />
        </button>
        <button
          type="button"
          onClick={onRevoke}
          aria-label={t('access.revoke')}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-state-destructive-hover hover:text-text-destructive"
        >
          <span className="i-ri-delete-bin-line h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

const permissionIcon: Record<AccessPermissionKind, string> = {
  organization: 'i-ri-team-line',
  specific: 'i-ri-lock-line',
  anyone: 'i-ri-global-line',
}

const permissionOrder: AccessPermissionKind[] = ['organization', 'specific', 'anyone']

type PermissionPickerProps = {
  value: AccessPermissionKind
  disabled?: boolean
  onChange: (kind: AccessPermissionKind) => void
}

const PermissionPicker: FC<PermissionPickerProps> = ({ value, disabled, onChange }) => {
  const { t } = useTranslation('deployments')
  const icon = permissionIcon[value]
  const label = t(`access.permission.${value}`)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          'inline-flex h-8 min-w-[220px] items-center gap-2 rounded-lg border-[0.5px] border-components-input-border-active bg-components-input-bg-normal px-2.5 system-sm-regular text-text-secondary hover:bg-state-base-hover',
          disabled && 'opacity-50',
        )}
      >
        <span className={cn(icon, 'h-4 w-4 shrink-0 text-text-tertiary')} />
        <span className="flex-1 truncate text-left">{label}</span>
        <span className="i-ri-arrow-down-s-line h-4 w-4 shrink-0 text-text-tertiary" />
      </DropdownMenuTrigger>
      <DropdownMenuContent placement="bottom-start" popupClassName="w-[340px] p-1">
        {permissionOrder.map((kind) => {
          const itemIcon = permissionIcon[kind]
          const isSelected = kind === value
          return (
            <DropdownMenuItem
              key={kind}
              onSelect={() => onChange(kind)}
              className="mx-0 h-auto items-start gap-3 rounded-lg px-2.5 py-2"
            >
              <span className={cn(itemIcon, 'mt-0.5 h-4 w-4 shrink-0 text-text-tertiary')} />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate system-sm-medium text-text-primary">
                    {t(`access.permission.${kind}`)}
                  </span>
                </div>
                <span className="system-xs-regular text-text-tertiary">
                  {t(`access.permission.${kind}Desc`)}
                </span>
              </div>
              {isSelected && (
                <span className="mt-0.5 i-ri-check-line h-4 w-4 shrink-0 text-text-accent" />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type SelectableAccessSubject = AccessSubjectDisplay & {
  id: string
  subjectType: string
}

function normalizeSubject(subject: AccessSubjectDisplay): SelectableAccessSubject | undefined {
  if (!subject.id || !subject.subjectType)
    return undefined

  return {
    ...subject,
    id: subject.id,
    subjectType: subject.subjectType,
  }
}

function subjectKey(subject: Pick<SelectableAccessSubject, 'id' | 'subjectType'>) {
  return `${subject.subjectType}:${subject.id}`
}

function policySubjects(subjects: SelectableAccessSubject[]): AccessSubject[] {
  return subjects.map(subject => ({
    subjectId: subject.id,
    subjectType: subject.subjectType,
  }))
}

function selectedSubjectsFromPolicy(policy?: AccessPolicyDetail) {
  const selectedOption = policy?.options?.find(option => option.selected)
    ?? policy?.options?.find(option => option.mode === policy?.accessMode)
  return [
    ...(selectedOption?.groups ?? []),
    ...(selectedOption?.members ?? []),
  ].map(normalizeSubject).filter((subject): subject is SelectableAccessSubject => Boolean(subject))
}

type SubjectPillProps = {
  subject: SelectableAccessSubject
  disabled?: boolean
  onRemove: () => void
}

const SubjectPill: FC<SubjectPillProps> = ({ subject, disabled, onRemove }) => {
  const { t } = useTranslation('deployments')
  const isGroup = subject.subjectType === 'group'

  return (
    <div className="inline-flex max-w-full items-center gap-1 rounded-full border border-divider-subtle bg-components-badge-white-to-dark px-2 py-1">
      <span className={cn(isGroup ? 'i-ri-group-line' : 'i-ri-user-line', 'h-3.5 w-3.5 shrink-0 text-text-tertiary')} />
      <span className="truncate system-xs-medium text-text-secondary">{subject.name || subject.id}</span>
      {isGroup && subject.memberCount != null && (
        <span className="system-2xs-regular text-text-tertiary">{subject.memberCount}</span>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        aria-label={t('operation.remove', { ns: 'common' })}
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-text-quaternary hover:text-text-secondary',
          disabled && 'cursor-not-allowed opacity-40',
        )}
      >
        <span className="i-ri-close-circle-fill h-3.5 w-3.5" />
      </button>
    </div>
  )
}

type SubjectPickerProps = {
  appId: string
  disabled?: boolean
  selectedSubjects: SelectableAccessSubject[]
  onChange: (subjects: SelectableAccessSubject[]) => void
}

const SubjectPicker: FC<SubjectPickerProps> = ({
  appId,
  disabled,
  selectedSubjects,
  onChange,
}) => {
  const { t } = useTranslation('deployments')
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const debouncedKeyword = useDebounce(keyword, { wait: 300 })
  const selectedKeys = useMemo(
    () => new Set(selectedSubjects.map(subjectKey)),
    [selectedSubjects],
  )
  const subjectsQuery = useQuery(consoleQuery.deployments.searchAccessSubjects.queryOptions({
    input: open
      ? {
          params: { appId },
          query: {
            keyword: debouncedKeyword.trim() || undefined,
            subjectTypes: ['account', 'group'],
          },
        }
      : skipToken,
    staleTime: 30 * 1000,
  }))
  const subjects = useMemo(
    () => subjectsQuery.data?.data
      ?.map(normalizeSubject)
      .filter((subject): subject is SelectableAccessSubject => Boolean(subject)) ?? [],
    [subjectsQuery.data?.data],
  )

  const toggleSubject = (subject: SelectableAccessSubject) => {
    const key = subjectKey(subject)
    if (selectedKeys.has(key)) {
      if (selectedSubjects.length <= 1)
        return
      onChange(selectedSubjects.filter(item => subjectKey(item) !== key))
      return
    }
    onChange([...selectedSubjects, subject])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={(
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-lg border border-components-button-secondary-border bg-components-button-secondary-bg px-3 system-sm-medium text-components-button-secondary-text hover:bg-components-button-secondary-bg-hover',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <span className="i-ri-add-line h-3.5 w-3.5" />
            {t('access.members.pickPlaceholder')}
          </button>
        )}
      />
      {open && (
        <PopoverContent placement="bottom-start" sideOffset={4} popupClassName="w-[360px] p-0">
          <div className="flex max-h-[420px] flex-col overflow-hidden rounded-xl border border-components-panel-border bg-components-panel-bg shadow-lg">
            <div className="border-b border-divider-subtle p-2">
              <div className="flex h-8 items-center gap-2 rounded-lg border-[0.5px] border-components-input-border-active bg-components-input-bg-normal px-2">
                <span className="i-ri-search-line h-4 w-4 shrink-0 text-text-tertiary" />
                <input
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder={t('access.members.searchPlaceholder')}
                  className="min-w-0 flex-1 bg-transparent system-sm-regular text-text-primary outline-none placeholder:text-text-quaternary"
                />
              </div>
            </div>
            <div className="min-h-10 overflow-y-auto p-1">
              {subjectsQuery.isLoading
                ? (
                    <div className="flex h-16 items-center justify-center">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-components-panel-border border-t-transparent" />
                    </div>
                  )
                : subjects.length === 0
                  ? (
                      <div className="px-3 py-5 text-center system-xs-regular text-text-tertiary">
                        {t('access.members.empty')}
                      </div>
                    )
                  : subjects.map((subject) => {
                      const isSelected = selectedKeys.has(subjectKey(subject))
                      const isGroup = subject.subjectType === 'group'
                      return (
                        <button
                          key={subjectKey(subject)}
                          type="button"
                          onClick={() => toggleSubject(subject)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-state-base-hover"
                        >
                          <span className={cn(isGroup ? 'i-ri-group-line' : 'i-ri-user-line', 'h-4 w-4 shrink-0 text-text-tertiary')} />
                          <span className="min-w-0 flex-1 truncate system-sm-medium text-text-secondary">
                            {subject.name || subject.id}
                          </span>
                          {isGroup && subject.memberCount != null && (
                            <span className="system-xs-regular text-text-tertiary">
                              {t('access.members.memberCount', { count: subject.memberCount })}
                            </span>
                          )}
                          {isSelected && (
                            <span className="i-ri-check-line h-4 w-4 shrink-0 text-text-accent" />
                          )}
                        </button>
                      )
                    })}
            </div>
          </div>
        </PopoverContent>
      )}
    </Popover>
  )
}

type EnvironmentPermissionRowProps = {
  appId: string
  environment: ConsoleEnvironmentSummary
  summaryPolicy?: EffectivePolicySummary
  onSetPolicy: (
    appId: string,
    environmentId: string,
    channel: string,
    enabled: boolean,
    accessMode: string,
    subjects: AccessSubject[],
    expectedVersion: number,
  ) => Promise<void>
}

const EnvironmentPermissionRow: FC<EnvironmentPermissionRowProps> = ({
  appId,
  environment,
  summaryPolicy,
  onSetPolicy,
}) => {
  const { t } = useTranslation('deployments')
  const environmentId = environment.id
  const channel = summaryPolicy?.channel ?? 'webapp'
  const policyQuery = useQuery(consoleQuery.deployments.environmentAccessPolicy.queryOptions({
    input: environmentId
      ? {
          params: {
            appId,
            environmentId,
            channel,
          },
        }
      : skipToken,
    staleTime: 30 * 1000,
  }))
  const detailPolicy = policyQuery.data?.policy
  const policyKind = accessModeToPermissionKey(detailPolicy?.accessMode ?? summaryPolicy?.accessMode)
  const policyFingerprint = [
    detailPolicy?.id ?? 'new',
    detailPolicy?.version ?? summaryPolicy?.version ?? 0,
    detailPolicy?.accessMode ?? summaryPolicy?.accessMode ?? '',
  ].join(':')
  const policySelectedSubjects = useMemo(
    () => policyKind === 'specific' ? selectedSubjectsFromPolicy(detailPolicy) : [],
    [detailPolicy, policyKind],
  )
  const [draft, setDraft] = useState<{
    fingerprint?: string
    kind?: AccessPermissionKind
    subjects?: SelectableAccessSubject[]
  }>({})
  const [isSaving, setIsSaving] = useState(false)
  const hasDraft = draft.fingerprint === policyFingerprint
  const permissionKind = hasDraft && draft.kind ? draft.kind : policyKind
  const subjects = hasDraft && draft.subjects ? draft.subjects : policySelectedSubjects

  const persistPolicy = async (nextKind: AccessPermissionKind, nextSubjects: SelectableAccessSubject[]) => {
    if (!environmentId)
      return
    if (nextKind === 'specific' && nextSubjects.length === 0)
      return

    setIsSaving(true)
    try {
      await onSetPolicy(
        appId,
        environmentId,
        detailPolicy?.channel ?? channel,
        detailPolicy?.enabled ?? summaryPolicy?.enabled ?? true,
        permissionKeyToAccessMode(nextKind),
        nextKind === 'specific' ? policySubjects(nextSubjects) : [],
        detailPolicy?.version ?? summaryPolicy?.version ?? 0,
      )
      await policyQuery.refetch()
      setDraft({})
    }
    catch {
      toast.error(t('access.permission.updateFailed'))
    }
    finally {
      setIsSaving(false)
    }
  }

  const handlePermissionChange = (nextKind: AccessPermissionKind) => {
    setDraft({
      fingerprint: policyFingerprint,
      kind: nextKind,
      subjects: nextKind === 'specific' ? subjects : [],
    })
    if (nextKind === 'specific') {
      void persistPolicy(nextKind, subjects)
      return
    }
    void persistPolicy(nextKind, [])
  }

  const handleSubjectsChange = (nextSubjects: SelectableAccessSubject[]) => {
    if (nextSubjects.length === 0)
      return
    setDraft({
      fingerprint: policyFingerprint,
      kind: 'specific',
      subjects: nextSubjects,
    })
    void persistPolicy('specific', nextSubjects)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="min-w-[140px] system-xs-regular text-text-tertiary">
          {environmentName(environment)}
        </span>
        <PermissionPicker
          value={permissionKind}
          disabled={isSaving || policyQuery.isLoading}
          onChange={handlePermissionChange}
        />
      </div>
      {permissionKind === 'specific' && (
        <div className="flex flex-col gap-2 pl-0 sm:pl-[152px]">
          <div className="flex flex-wrap items-center gap-2">
            <SubjectPicker
              appId={appId}
              selectedSubjects={subjects}
              disabled={isSaving || policyQuery.isLoading}
              onChange={handleSubjectsChange}
            />
            {subjects.length === 0 && (
              <span className="system-xs-regular text-text-tertiary">
                {t('access.members.emptySelection')}
              </span>
            )}
          </div>
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {subjects.map(subject => (
                <SubjectPill
                  key={subjectKey(subject)}
                  subject={subject}
                  disabled={isSaving || subjects.length <= 1}
                  onRemove={() => handleSubjectsChange(subjects.filter(item => subjectKey(item) !== subjectKey(subject)))}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type EndpointRowProps = {
  envName: string
  label: string
  value: string
  openLabel?: string
}

const EndpointRow: FC<EndpointRowProps> = ({ envName, label, value, openLabel }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
    <span className="min-w-[140px] system-xs-regular text-text-tertiary">
      {envName}
    </span>
    <CopyPill label={label} value={value} className="min-w-[260px] flex-1" />
    {openLabel && (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-components-button-secondary-border bg-components-button-secondary-bg px-3 system-sm-medium text-components-button-secondary-text hover:bg-components-button-secondary-bg-hover"
      >
        <span className="i-ri-external-link-line h-3.5 w-3.5" />
        {openLabel}
      </a>
    )}
  </div>
)

type ApiKeyGenerateMenuProps = {
  environments: ConsoleEnvironmentSummary[]
  onGenerate: (environmentId: string) => void
}

const ApiKeyGenerateMenu: FC<ApiKeyGenerateMenuProps> = ({ environments, onGenerate }) => {
  const { t } = useTranslation('deployments')
  const [open, setOpen] = useState(false)
  const selectableEnvironments = environments.filter(env => env.id)
  const disabled = selectableEnvironments.length === 0

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 system-sm-medium',
          'border border-components-button-secondary-border bg-components-button-secondary-bg text-components-button-secondary-text',
          'hover:bg-components-button-secondary-bg-hover',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className="i-ri-add-line h-3.5 w-3.5" />
        {t('access.api.newKey')}
        <span className="i-ri-arrow-down-s-line h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      {open && !disabled && (
        <DropdownMenuContent placement="bottom-end" sideOffset={4} popupClassName="w-[220px]">
          {selectableEnvironments.map(env => (
            <DropdownMenuItem
              key={env.id}
              className="gap-2 px-3"
              onClick={() => {
                setOpen(false)
                onGenerate(env.id!)
              }}
            >
              <span className="system-sm-regular text-text-secondary">
                {t('access.api.newKeyForEnv', { env: environmentName(env) })}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}

function getUrlOrigin(url?: string) {
  if (!url)
    return undefined
  try {
    return new URL(url).origin
  }
  catch {
    return url
  }
}

function uniqueEnvironments(environments: (ConsoleEnvironmentSummary | undefined)[]) {
  return environments.filter((environment, index): environment is ConsoleEnvironmentSummary => {
    if (!environment?.id)
      return false
    return environments.findIndex(candidate => candidate?.id === environment.id) === index
  })
}

type AccessTabProps = {
  instanceId: string
}

const AccessTab: FC<AccessTabProps> = ({ instanceId: appId }) => {
  const { t } = useTranslation('deployments')
  const appData = useDeploymentsStore(state => state.appData[appId])
  const createdApiToken = useDeploymentsStore(state => state.createdApiToken)
  const clearCreatedApiToken = useDeploymentsStore(state => state.clearCreatedApiToken)
  const generateApiKey = useDeploymentsStore(state => state.generateApiKey)
  const revokeApiKey = useDeploymentsStore(state => state.revokeApiKey)
  const toggleAccessChannel = useDeploymentsStore(state => state.toggleAccessChannel)
  const setEnvironmentAccessPolicy = useDeploymentsStore(state => state.setEnvironmentAccessPolicy)

  const accessConfig = appData?.accessConfig
  const deploymentRows = useMemo(
    () => deployedRows(appData?.environmentDeployments.environmentDeployments),
    [appData?.environmentDeployments.environmentDeployments],
  )
  const policies = useMemo(
    () => accessConfig?.userAccess?.environmentPolicies ?? [],
    [accessConfig?.userAccess?.environmentPolicies],
  )
  const deployedEnvs = useMemo(
    () => uniqueEnvironments([
      ...deploymentRows.map(row => row.environment),
      ...policies.map(policy => policy.environment),
      ...(accessConfig?.webapp?.rows?.map(row => row.environment) ?? []),
    ]),
    [accessConfig?.webapp?.rows, deploymentRows, policies],
  )
  const apiEnabled = accessConfig?.developerApi?.enabled ?? false
  const apiTokenEnvironments = useMemo(
    () => deployedEnvs.filter((env): env is ConsoleEnvironmentSummary & { id: string } => Boolean(env.id)),
    [deployedEnvs],
  )
  const apiTokenQueries = useQueries({
    queries: apiTokenEnvironments.map(env => consoleQuery.deployments.environmentAPITokens.queryOptions({
      input: {
        params: {
          appId,
          environmentId: env.id,
        },
      },
      enabled: apiEnabled,
      staleTime: 30 * 1000,
    })),
  })
  const apiTokenRows = apiTokenQueries.flatMap((query, index): DeveloperAPIKeySummary[] => {
    const env = apiTokenEnvironments[index]
    return query.data?.data?.map((token: APIToken) => ({
      ...token,
      environmentName: token.environmentId ? environmentName(env) : undefined,
    })) ?? []
  })
  const apiKeys = apiTokenQueries.some(query => query.isSuccess)
    ? apiTokenRows
    : accessConfig?.developerApi?.apiKeys ?? []
  const refetchApiTokens = async () => {
    await Promise.all(apiTokenQueries.map(query => query.refetch()))
  }
  const handleGenerateApiKey = (environmentId: string) => {
    void (async () => {
      await generateApiKey(appId, environmentId)
      await refetchApiTokens()
    })()
  }
  const handleRevokeApiKey = (environmentId: string, apiKeyId: string) => {
    void (async () => {
      await revokeApiKey(appId, environmentId, apiKeyId)
      await refetchApiTokens()
    })()
  }
  const webappRows = accessConfig?.webapp?.rows?.filter(row => row.url) ?? []
  const runEnabled = accessConfig?.webapp?.enabled ?? false
  const visibleCreatedApiToken = createdApiToken?.appId === appId ? createdApiToken : undefined
  const webappChannelVersion = policies.find(policy => policy.effectivePolicy?.channel === 'webapp')?.effectivePolicy?.version ?? 0
  const cliDomain = getUrlOrigin(accessConfig?.cli?.url)
  const cliDocsUrl = cliDomain ? `${cliDomain}/cli` : undefined

  return (
    <div className="flex flex-col gap-5 p-6">
      <Section
        title={t('access.permissions.title')}
        description={t('access.permissions.description')}
      >
        {deployedEnvs.length === 0
          ? (
              <div className="rounded-lg border border-dashed border-components-panel-border bg-components-panel-bg-blur px-4 py-6 text-center system-sm-regular text-text-tertiary">
                {t('access.runAccess.noEnvs')}
              </div>
            )
          : (
              <div className="flex flex-col gap-3">
                {deployedEnvs.map((env) => {
                  const policy = policies.find(item => item.environment?.id === env.id)?.effectivePolicy
                  return (
                    <EnvironmentPermissionRow
                      key={env.id}
                      appId={appId}
                      environment={env}
                      summaryPolicy={policy}
                      onSetPolicy={setEnvironmentAccessPolicy}
                    />
                  )
                })}
              </div>
            )}
      </Section>

      <Section
        title={t('access.channels.title')}
        description={t('access.channels.description')}
        action={(
          <Switch
            checked={runEnabled}
            onCheckedChange={v => toggleAccessChannel(appId, 'webapp', v, webappChannelVersion)}
          />
        )}
      >
        {runEnabled
          ? (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="system-sm-medium text-text-primary">
                        {t('access.runAccess.webapp')}
                      </div>
                      <span className="inline-flex h-5 items-center rounded-full bg-state-success-hover px-1.5 system-2xs-medium text-state-success-solid">
                        {t('access.channels.followPermission')}
                      </span>
                    </div>
                    <div className="system-xs-regular text-text-tertiary">
                      {t('access.runAccess.webappDesc')}
                    </div>
                    {webappRows.length > 0
                      ? (
                          <div className="flex flex-col gap-2">
                            {webappRows.map((row) => {
                              const endpointUrl = webappUrl(row.url)

                              return (
                                <EndpointRow
                                  key={`webapp-${row.environment?.id ?? row.url}`}
                                  envName={environmentName(row.environment)}
                                  label={t('access.runAccess.urlLabel')}
                                  value={endpointUrl}
                                  openLabel={t('access.runAccess.openWebapp')}
                                />
                              )
                            })}
                          </div>
                        )
                      : (
                          <div className="rounded-lg border border-dashed border-components-panel-border bg-components-panel-bg-blur px-4 py-6 text-center system-sm-regular text-text-tertiary">
                            {t('access.runAccess.webappEmpty')}
                          </div>
                        )}
                  </div>
                  <div className="flex flex-col gap-1.5 border-t border-divider-subtle pt-3">
                    <div className="flex items-center gap-2">
                      <div className="system-sm-medium text-text-primary">
                        {t('access.cli.title')}
                      </div>
                      <span className="inline-flex h-5 items-center rounded-full bg-state-success-hover px-1.5 system-2xs-medium text-state-success-solid">
                        {t('access.channels.followPermission')}
                      </span>
                    </div>
                    <div className="system-xs-regular text-text-tertiary">
                      {t('access.cli.description')}
                    </div>
                    {cliDomain
                      ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <CopyPill
                              label={t('access.cli.domain')}
                              value={cliDomain}
                              className="min-w-[260px] flex-1"
                            />
                            <a
                              href={cliDocsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-components-button-secondary-border bg-components-button-secondary-bg px-3 system-sm-medium text-components-button-secondary-text hover:bg-components-button-secondary-bg-hover"
                            >
                              <span className="i-ri-download-cloud-2-line h-3.5 w-3.5" />
                              {t('access.cli.install')}
                            </a>
                            <a
                              href={cliDocsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-components-button-secondary-border bg-components-button-secondary-bg px-3 system-sm-medium text-components-button-secondary-text hover:bg-components-button-secondary-bg-hover"
                            >
                              <span className="i-ri-book-open-line h-3.5 w-3.5" />
                              {t('access.cli.docs')}
                            </a>
                          </div>
                        )
                      : (
                          <div className="system-xs-regular text-text-tertiary">
                            {t('access.cli.empty')}
                          </div>
                        )}
                  </div>
                </div>
              </div>
            )
          : (
              <div className="system-xs-regular text-text-tertiary">
                {t('access.channels.disabled')}
              </div>
            )}
      </Section>

      <Section
        title={t('access.api.developerTitle')}
        description={t('access.api.description')}
        action={(
          <Switch
            checked={apiEnabled}
            onCheckedChange={v => toggleAccessChannel(appId, 'api', v, 0)}
          />
        )}
      >
        {apiEnabled
          ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="system-sm-medium text-text-primary">
                      {t('access.api.backendTitle')}
                    </span>
                    <span className="system-xs-regular text-text-tertiary">
                      {t('access.api.keyList')}
                    </span>
                  </div>
                  <ApiKeyGenerateMenu
                    environments={deployedEnvs}
                    onGenerate={handleGenerateApiKey}
                  />
                </div>
                {visibleCreatedApiToken && (
                  <div className="flex flex-col gap-2 rounded-lg border border-components-panel-border bg-components-panel-bg-blur p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col">
                        <span className="system-sm-medium text-text-primary">
                          {t('access.api.newTokenTitle')}
                        </span>
                        <span className="system-xs-regular text-text-tertiary">
                          {t('access.api.newTokenDescription')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={clearCreatedApiToken}
                        aria-label={t('access.api.dismissToken')}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-state-base-hover hover:text-text-secondary"
                      >
                        <span className="i-ri-close-line h-3.5 w-3.5" />
                      </button>
                    </div>
                    <CopyPill
                      label={t('access.api.newTokenLabel')}
                      value={visibleCreatedApiToken.token}
                    />
                  </div>
                )}
                {apiKeys.length === 0
                  ? (
                      <div className="rounded-lg border border-dashed border-components-panel-border bg-components-panel-bg-blur px-4 py-6 text-center system-sm-regular text-text-tertiary">
                        {deployedEnvs.length === 0
                          ? t('access.api.empty')
                          : t('access.api.noKeys')}
                      </div>
                    )
                  : (
                      <div className="flex flex-col divide-y divide-divider-subtle">
                        {apiKeys.map((apiKey) => {
                          if (!apiKey.id || !apiKey.environmentId)
                            return null
                          return (
                            <ApiKeyRow
                              key={apiKey.id}
                              apiKey={apiKey}
                              onRevoke={() => handleRevokeApiKey(apiKey.environmentId!, apiKey.id!)}
                            />
                          )
                        })}
                      </div>
                    )}
              </div>
            )
          : (
              <div className="system-xs-regular text-text-tertiary">
                {t('access.api.disabled')}
              </div>
            )}
      </Section>
    </div>
  )
}

export default AccessTab
