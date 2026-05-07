'use client'

import { useQuery } from '@tanstack/react-query'
import { useDebounce } from 'ahooks'
import { debounce, useQueryState } from 'nuqs'
import { useTranslation } from 'react-i18next'
import Input from '@/app/components/base/input'
import { consoleQuery } from '@/service/client'
import { CreateInstanceModal } from '../components/create-instance-modal'
import { DeployDrawer } from '../components/deploy-drawer'
import { RollbackModal } from '../components/rollback-modal'
import { SOURCE_APPS_PAGE_SIZE } from '../data'
import { EnvironmentFilter } from './environment-filter'
import { InstanceCard } from './instance-card'
import { NewInstanceCard } from './new-instance-card'
import { envFilterQueryState, keywordsQueryState } from './query-state'

function DeploymentsSearchInput() {
  const { t } = useTranslation('deployments')
  const [keywords, setKeywords] = useQueryState('keywords', keywordsQueryState)

  function handleKeywordsChange(next: string) {
    void setKeywords(next.trim() ? next : null, {
      limitUrlUpdates: next.trim() ? debounce(300) : undefined,
    })
  }

  return (
    <Input
      showLeftIcon
      showClearIcon
      wrapperClassName="w-[200px]"
      placeholder={t('filter.searchPlaceholder')}
      value={keywords}
      onChange={e => handleKeywordsChange(e.target.value)}
      onClear={() => handleKeywordsChange('')}
    />
  )
}

function DeploymentsListControls() {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-end gap-y-2 bg-background-body px-12 pt-7 pb-5">
      <div className="flex items-center gap-2">
        <EnvironmentFilter />
        <DeploymentsSearchInput />
      </div>
    </div>
  )
}

function DeploymentsList() {
  const [envFilter] = useQueryState('env', envFilterQueryState)
  const [keywords] = useQueryState('keywords', keywordsQueryState)
  const debouncedKeywords = useDebounce(keywords, { wait: 300 })
  const queryKeywords = keywords.trim() ? debouncedKeywords : keywords

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
  const apps = listQuery.data?.data ?? []

  return (
    <div className="relative flex h-0 shrink-0 grow flex-col overflow-y-auto bg-background-body">
      <DeploymentsListControls />
      <div className="relative grid grow grid-cols-1 content-start gap-4 px-12 pt-2 2k:grid-cols-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        <NewInstanceCard />
        {apps.map(app => (
          <InstanceCard
            key={app.id}
            app={app}
          />
        ))}
      </div>

      <div className="py-4" />
    </div>
  )
}

export function DeploymentsMain() {
  return (
    <>
      <DeploymentsList />
      <CreateInstanceModal />
      <DeployDrawer />
      <RollbackModal />
    </>
  )
}
