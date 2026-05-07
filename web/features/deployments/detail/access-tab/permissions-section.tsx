'use client'

import type { AccessPermission, AccessSubject, ConsoleEnvironmentSummary } from '@/features/deployments/types'
import { useTranslation } from 'react-i18next'
import { Section } from './common'
import { EnvironmentPermissionRow } from './permissions'

type AccessPermissionsSectionProps = {
  appId: string
  environments: ConsoleEnvironmentSummary[]
  policies: AccessPermission[]
  onSetPolicy: (
    environmentId: string,
    accessMode: string,
    subjects: AccessSubject[],
  ) => Promise<void>
}

export function AccessPermissionsSection({
  appId,
  environments,
  policies,
  onSetPolicy,
}: AccessPermissionsSectionProps) {
  const { t } = useTranslation('deployments')

  return (
    <Section
      title={t('access.permissions.title')}
      description={t('access.permissions.description')}
    >
      {environments.length === 0
        ? (
            <div className="rounded-lg border border-dashed border-components-panel-border bg-components-panel-bg-blur px-4 py-6 text-center system-sm-regular text-text-tertiary">
              {t('access.runAccess.noEnvs')}
            </div>
          )
        : (
            <div className="flex flex-col gap-3">
              {environments.map((env) => {
                const policy = policies.find(item => item.environment?.id === env.id)
                return (
                  <EnvironmentPermissionRow
                    key={env.id}
                    appId={appId}
                    environment={env}
                    summaryPolicy={policy}
                    onSetPolicy={onSetPolicy}
                  />
                )
              })}
            </div>
          )}
    </Section>
  )
}
