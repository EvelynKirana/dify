'use client'

import type { NavItem } from '../nav/nav-selector'
import type { AppIconSelection } from '@/app/components/base/app-icon-picker'
import { toast } from '@langgenius/dify-ui/toast'
import { flatten } from 'es-toolkit/compat'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore as useAppStore } from '@/app/components/app/store'
import CreateSnippetDialog from '@/app/components/workflow/create-snippet-dialog'
import { useAppContext } from '@/context/app-context'
import dynamic from '@/next/dynamic'
import { useParams, usePathname, useRouter } from '@/next/navigation'
import { useInfiniteAppList } from '@/service/use-apps'
import {
  useCreateSnippetMutation,
  useInfiniteSnippetList,
  useSnippetApiDetail,
} from '@/service/use-snippets'
import { AppModeEnum } from '@/types/app'
import Nav from '../nav'

const CreateAppTemplateDialog = dynamic(() => import('@/app/components/app/create-app-dialog'), { ssr: false })
const CreateAppModal = dynamic(() => import('@/app/components/app/create-app-modal'), { ssr: false })
const CreateFromDSLModal = dynamic(() => import('@/app/components/app/create-from-dsl-modal'), { ssr: false })

const AppNav = () => {
  const { t } = useTranslation()
  const { appId, snippetId } = useParams()
  const { push } = useRouter()
  const pathname = usePathname()
  const isSnippetSegment = pathname === '/snippets' || pathname.startsWith('/snippets/')
  const currentSnippetId = typeof snippetId === 'string' ? snippetId : ''
  const { isCurrentWorkspaceEditor } = useAppContext()
  const appDetail = useAppStore(state => state.appDetail)
  const [showNewAppDialog, setShowNewAppDialog] = useState(false)
  const [showNewAppTemplateDialog, setShowNewAppTemplateDialog] = useState(false)
  const [showCreateFromDSLModal, setShowCreateFromDSLModal] = useState(false)
  const [showCreateSnippetDialog, setShowCreateSnippetDialog] = useState(false)
  const createSnippetMutation = useCreateSnippetMutation()

  const {
    data: appsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteAppList({
    page: 1,
    limit: 30,
    name: '',
  }, { enabled: !!appId && !isSnippetSegment })

  const {
    data: snippetsData,
    fetchNextPage: fetchNextSnippetPage,
    hasNextPage: hasNextSnippetPage,
    isFetchingNextPage: isFetchingNextSnippetPage,
  } = useInfiniteSnippetList({
    page: 1,
    limit: 30,
  }, { enabled: !!currentSnippetId })

  const { data: snippetDetail } = useSnippetApiDetail(currentSnippetId)

  const handleLoadMore = useCallback(() => {
    if (hasNextPage)
      fetchNextPage()
  }, [fetchNextPage, hasNextPage])

  const handleLoadMoreSnippet = useCallback(() => {
    if (hasNextSnippetPage)
      fetchNextSnippetPage()
  }, [fetchNextSnippetPage, hasNextSnippetPage])

  const openModal = (state: string) => {
    if (isSnippetSegment) {
      setShowCreateSnippetDialog(true)
      return
    }

    if (state === 'blank')
      setShowNewAppDialog(true)
    if (state === 'template')
      setShowNewAppTemplateDialog(true)
    if (state === 'dsl')
      setShowCreateFromDSLModal(true)
  }

  const appNavItems = useMemo<NavItem[]>(() => {
    if (!appsData)
      return []

    const appItems = flatten((appsData.pages ?? []).map(appData => appData.data))

    return appItems.map((app) => {
      const link = (() => {
        if (!isCurrentWorkspaceEditor)
          return `/app/${app.id}/overview`

        if (app.mode === AppModeEnum.WORKFLOW || app.mode === AppModeEnum.ADVANCED_CHAT)
          return `/app/${app.id}/workflow`

        return `/app/${app.id}/configuration`
      })()

      return {
        id: app.id,
        icon_type: app.icon_type,
        icon: app.icon,
        icon_background: app.icon_background,
        icon_url: app.icon_url,
        name: appDetail?.id === app.id ? appDetail.name : app.name,
        mode: app.mode,
        link,
      }
    })
  }, [appDetail?.id, appDetail?.name, appsData, isCurrentWorkspaceEditor])

  const snippetNavItems = useMemo<NavItem[]>(() => {
    if (!snippetsData)
      return []

    const snippetItems = flatten((snippetsData.pages ?? []).map(snippetData => snippetData.data))

    return snippetItems.map(snippet => ({
      id: snippet.id,
      icon_type: snippet.icon_info.icon_type,
      icon: snippet.icon_info.icon,
      icon_background: snippet.icon_info.icon_background ?? null,
      icon_url: snippet.icon_info.icon_url ?? null,
      name: snippet.name,
      link: `/snippets/${snippet.id}/orchestrate`,
    }))
  }, [snippetsData])

  const currentSnippetNav = useMemo(() => {
    if (!snippetDetail)
      return

    if (snippetDetail.id !== currentSnippetId)
      return

    return {
      id: snippetDetail.id,
      icon_type: snippetDetail.icon_info.icon_type,
      icon: snippetDetail.icon_info.icon,
      icon_background: snippetDetail.icon_info.icon_background ?? null,
      icon_url: snippetDetail.icon_info.icon_url ?? null,
      name: snippetDetail.name,
    }
  }, [currentSnippetId, snippetDetail])

  const handleCreateSnippet = useCallback(({
    name,
    description,
    icon,
  }: {
    name: string
    description: string
    icon: AppIconSelection
  }) => {
    createSnippetMutation.mutate({
      body: {
        name,
        description: description || undefined,
        icon_info: {
          icon: icon.type === 'emoji' ? icon.icon : icon.fileId,
          icon_type: icon.type,
          icon_background: icon.type === 'emoji' ? icon.background : undefined,
          icon_url: icon.type === 'image' ? icon.url : undefined,
        },
      },
    }, {
      onSuccess: (snippet) => {
        toast.success(t('snippet.createSuccess', { ns: 'workflow' }))
        setShowCreateSnippetDialog(false)
        push(`/snippets/${snippet.id}/orchestrate`)
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : t('createFailed', { ns: 'snippet' }))
      },
    })
  }, [createSnippetMutation, push, t])

  const currentNav = isSnippetSegment ? currentSnippetNav : appDetail
  const currentNavigationItems = isSnippetSegment ? snippetNavItems : appNavItems
  const currentCreateText = isSnippetSegment
    ? t('createFromBlank', { ns: 'snippet' })
    : t('menus.newApp', { ns: 'common' })
  const currentLoadMore = isSnippetSegment ? handleLoadMoreSnippet : handleLoadMore
  const currentIsLoadingMore = isSnippetSegment ? isFetchingNextSnippetPage : isFetchingNextPage

  return (
    <>
      <Nav
        isApp={!isSnippetSegment}
        icon={<span className="i-ri-robot-2-line h-4 w-4" />}
        activeIcon={<span className="i-ri-robot-2-fill h-4 w-4" />}
        text={t('menus.apps', { ns: 'common' })}
        activeSegment={['apps', 'app', 'snippets']}
        link={isSnippetSegment ? '/snippets' : '/apps'}
        curNav={currentNav ?? undefined}
        navigationItems={currentNavigationItems}
        createText={currentCreateText}
        onCreate={openModal}
        onLoadMore={currentLoadMore}
        isLoadingMore={currentIsLoadingMore}
      />
      <CreateAppModal
        show={showNewAppDialog}
        onClose={() => setShowNewAppDialog(false)}
        onSuccess={() => refetch()}
      />
      <CreateAppTemplateDialog
        show={showNewAppTemplateDialog}
        onClose={() => setShowNewAppTemplateDialog(false)}
        onSuccess={() => refetch()}
      />
      <CreateFromDSLModal
        show={showCreateFromDSLModal}
        onClose={() => setShowCreateFromDSLModal(false)}
        onSuccess={() => refetch()}
      />
      {showCreateSnippetDialog && (
        <CreateSnippetDialog
          isOpen={showCreateSnippetDialog}
          isSubmitting={createSnippetMutation.isPending}
          onClose={() => setShowCreateSnippetDialog(false)}
          onConfirm={handleCreateSnippet}
        />
      )}
    </>
  )
}

export default AppNav
