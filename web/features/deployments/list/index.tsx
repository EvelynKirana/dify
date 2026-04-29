'use client'

import type { FC } from 'react'
import { useDebounceFn } from 'ahooks'
import { parseAsString, useQueryState } from 'nuqs'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '@/app/components/base/input'
import CreateInstanceModal from '../components/create-instance-modal'
import DeployDrawer from '../components/deploy-drawer'
import RollbackModal from '../components/rollback-modal'
import { useSourceApps } from '../hooks/use-source-apps'
import { useDeploymentsStore } from '../store'
import { environmentId, environmentName } from '../utils'
import { EnvironmentFilter } from './environment-filter'
import { InstanceCard } from './instance-card'
import { NewInstanceCard } from './new-instance-card'

const DeploymentsMain: FC = () => {
  const { t } = useTranslation('deployments')
  const appData = useDeploymentsStore(state => state.appData)
  const openCreateInstanceModal = useDeploymentsStore(state => state.openCreateInstanceModal)

  const [envFilter, setEnvFilter] = useQueryState(
    'env',
    parseAsString.withDefault('all').withOptions({ history: 'push' }),
  )
  const [keywords, setKeywords] = useQueryState(
    'keywords',
    parseAsString.withDefault('').withOptions({ history: 'push' }),
  )
  const [keywordsInput, setKeywordsInput] = useState(keywords)

  const { run: commitKeywords } = useDebounceFn((next: string) => {
    void setKeywords(next.trim() ? next : null)
  }, { wait: 300 })

  const handleKeywordsChange = (next: string) => {
    setKeywordsInput(next)
    commitKeywords(next)
  }

  const requestedEnvironmentId = envFilter !== 'all' && envFilter !== 'not-deployed'
    ? envFilter
    : undefined
  const {
    apps,
    summaries,
    environmentOptions,
  } = useSourceApps({
    environmentId: requestedEnvironmentId,
    notDeployed: envFilter === 'not-deployed',
    keyword: keywords.trim() || undefined,
  })

  const environments = useMemo(() => {
    return environmentOptions
      .filter(env => environmentId(env))
      .map(env => ({
        id: environmentId(env),
        name: environmentName(env),
        disabled: env.disabled,
        disabledReason: env.disabledReason,
      }))
  }, [environmentOptions])

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

  const visibleInstances = useMemo(() => {
    return apps
  }, [apps])

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
              value={keywordsInput}
              onChange={e => handleKeywordsChange(e.target.value)}
              onClear={() => handleKeywordsChange('')}
            />
          </div>
        </div>
        <div className="relative grid grow grid-cols-1 content-start gap-4 px-12 pt-2 2k:grid-cols-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          <NewInstanceCard onOpen={openCreateInstanceModal} />
          {visibleInstances.map(app => (
            <InstanceCard
              key={app.id}
              app={app}
              appData={appData[app.id]}
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

export default DeploymentsMain
