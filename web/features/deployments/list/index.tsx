'use client'

import { useQuery } from '@tanstack/react-query'
import { useDebounce } from 'ahooks'
import { debounce, parseAsString, useQueryState } from 'nuqs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '@/app/components/base/input'
import { consoleQuery } from '@/service/client'
import { CreateInstanceModal } from '../components/create-instance-modal'
import { DeployDrawer } from '../components/deploy-drawer'
import { RollbackModal } from '../components/rollback-modal'
import { SOURCE_APPS_PAGE_SIZE } from '../data'
import { useDeploymentsStore } from '../store'
import {
  deploymentSummariesFromList,
  sourceAppsFromList,
} from '../utils'
import { EnvironmentFilter } from './environment-filter'
import { InstanceCard } from './instance-card'
import { NewInstanceCard } from './new-instance-card'

export function DeploymentsMain() {
  const { t } = useTranslation('deployments')
  const openCreateInstanceModal = useDeploymentsStore(state => state.openCreateInstanceModal)

  const [envFilter, setEnvFilter] = useQueryState(
    'env',
    parseAsString.withDefault('all').withOptions({ history: 'push' }),
  )
  const [keywords, setKeywords] = useQueryState(
    'keywords',
    parseAsString.withDefault('').withOptions({ history: 'push' }),
  )
  const debouncedKeywords = useDebounce(keywords, { wait: 300 })
  const queryKeywords = keywords.trim() ? debouncedKeywords : keywords

  const handleKeywordsChange = (next: string) => {
    void setKeywords(next.trim() ? next : null, {
      limitUrlUpdates: next.trim() ? debounce(300) : undefined,
    })
  }

  const requestedEnvironmentId = envFilter !== 'all' && envFilter !== 'not-deployed'
    ? envFilter
    : undefined
  const listQuery = useQuery(consoleQuery.enterprise.appDeploy.listAppInstances.queryOptions({
    input: {
      query: {
        pageNumber: 1,
        resultsPerPage: SOURCE_APPS_PAGE_SIZE,
        ...(requestedEnvironmentId ? { environmentId: requestedEnvironmentId } : {}),
        ...(envFilter === 'not-deployed' ? { notDeployed: true } : {}),
        ...(queryKeywords.trim() ? { query: queryKeywords.trim() } : {}),
      },
    },
  }))
  const { data: environmentOptionsReply } = useQuery(consoleQuery.enterprise.appDeploy.listDeploymentEnvironmentOptions.queryOptions())
  const apps = useMemo(() => sourceAppsFromList(listQuery.data), [listQuery.data])
  const summaries = useMemo(() => deploymentSummariesFromList(listQuery.data), [listQuery.data])
  const environments = useMemo(() => {
    return environmentOptionsReply?.environments?.flatMap((env) => {
      if (!env.id)
        return []
      return [{
        id: env.id,
        name: env.name || env.id,
        disabled: env.deployable === false,
        disabledReason: env.disabledReason,
      }]
    }) ?? []
  }, [environmentOptionsReply])

  const envIdSet = useMemo(() => new Set(environments.map(e => e.id)), [environments])
  const activeFilter = envFilter === 'all' || envFilter === 'not-deployed' || envIdSet.has(envFilter)
    ? envFilter
    : 'all'

  const filterOptions = useMemo(() => {
    return [
      {
        value: 'all',
        text: t('filter.allEnvs'),
        icon: <span className="i-ri-apps-2-line h-[14px] w-[14px]" />,
      },
      ...environments.map(env => ({
        value: env.id,
        text: env.name,
        icon: <span className="i-ri-stack-line h-[14px] w-[14px]" />,
        disabled: env.disabled,
        disabledReason: env.disabledReason,
      })),
      {
        value: 'not-deployed',
        text: t('filter.notDeployed'),
        icon: <span className="i-ri-inbox-line h-[14px] w-[14px]" />,
      },
    ]
  }, [environments, t])

  return (
    <>
      <div className="relative flex h-0 shrink-0 grow flex-col overflow-y-auto bg-background-body">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-end gap-y-2 bg-background-body px-12 pt-7 pb-5">
          <div className="flex items-center gap-2">
            <EnvironmentFilter
              value={activeFilter}
              onChange={(next) => { void setEnvFilter(next) }}
              options={filterOptions}
            />
            <Input
              showLeftIcon
              showClearIcon
              wrapperClassName="w-[200px]"
              placeholder={t('filter.searchPlaceholder')}
              value={keywords}
              onChange={e => handleKeywordsChange(e.target.value)}
              onClear={() => handleKeywordsChange('')}
            />
          </div>
        </div>
        <div className="relative grid grow grid-cols-1 content-start gap-4 px-12 pt-2 2k:grid-cols-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          <NewInstanceCard onOpen={openCreateInstanceModal} />
          {apps.map(app => (
            <InstanceCard
              key={app.id}
              app={app}
              summary={summaries[app.id]}
            />
          ))}
        </div>

        <div className="py-4" />
      </div>

      <CreateInstanceModal />
      <DeployDrawer />
      <RollbackModal />
    </>
  )
}
