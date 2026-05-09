'use client'

import type {
  EnvironmentAccessRow,
} from '@dify/contracts/enterprise/types.gen'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { consoleQuery } from '@/service/client'
import { Section } from '../common'
import { EnvironmentPermissionRow } from './permissions'

type AccessPermissionsSectionProps = {
  appInstanceId: string
}

function hasEnvironment(row: EnvironmentAccessRow): row is EnvironmentAccessRow & {
  environment: NonNullable<EnvironmentAccessRow['environment']>
} {
  return Boolean(row.environment?.id)
}

export function AccessPermissionsSection({
  appInstanceId,
}: AccessPermissionsSectionProps) {
  const { t } = useTranslation('deployments')
  const { data: accessConfig } = useQuery(consoleQuery.enterprise.appDeploy.getAppInstanceAccess.queryOptions({
    input: {
      params: { appInstanceId },
    },
  }))
  const permissionRows = accessConfig?.permissions?.filter(hasEnvironment) ?? []

  return (
    <Section
      title={t('access.permissions.title')}
      description={t('access.permissions.description')}
    >
      {permissionRows.length === 0
        ? (
            <div className="rounded-lg border border-dashed border-components-panel-border bg-components-panel-bg-blur px-4 py-6 text-center system-sm-regular text-text-tertiary">
              {t('access.runAccess.noEnvs')}
            </div>
          )
        : (
            <div className="flex flex-col gap-3">
              {permissionRows.map(row => (
                <EnvironmentPermissionRow
                  key={row.environment.id}
                  appInstanceId={appInstanceId}
                  environment={row.environment}
                  summaryPolicy={row}
                />
              ))}
            </div>
          )}
    </Section>
  )
}
