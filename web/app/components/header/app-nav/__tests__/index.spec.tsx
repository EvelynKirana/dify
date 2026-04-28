import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useStore as useAppStore } from '@/app/components/app/store'
import { useAppContext } from '@/context/app-context'
import { useParams, usePathname, useRouter } from '@/next/navigation'
import { useInfiniteAppList } from '@/service/use-apps'
import { useCreateSnippetMutation, useInfiniteSnippetList, useSnippetApiDetail } from '@/service/use-snippets'
import { AppModeEnum } from '@/types/app'
import AppNav from '../index'

vi.mock('@/next/navigation', () => ({
  useParams: vi.fn(),
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/context/app-context', () => ({
  useAppContext: vi.fn(),
}))

vi.mock('@/app/components/app/store', () => ({
  useStore: vi.fn(),
}))

vi.mock('@/service/use-apps', () => ({
  useInfiniteAppList: vi.fn(),
}))

vi.mock('@/service/use-snippets', () => ({
  useCreateSnippetMutation: vi.fn(),
  useInfiniteSnippetList: vi.fn(),
  useSnippetApiDetail: vi.fn(),
}))

vi.mock('@langgenius/dify-ui/toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/app/components/app/create-app-dialog', () => ({
  default: ({ show, onClose, onSuccess }: { show: boolean, onClose: () => void, onSuccess: () => void }) =>
    show
      ? (
          <button
            type="button"
            data-testid="create-app-template-dialog"
            onClick={() => {
              onClose()
              onSuccess()
            }}
          >
            Create Template
          </button>
        )
      : null,
}))

vi.mock('@/app/components/app/create-app-modal', () => ({
  default: ({ show, onClose, onSuccess }: { show: boolean, onClose: () => void, onSuccess: () => void }) =>
    show
      ? (
          <button
            type="button"
            data-testid="create-app-modal"
            onClick={() => {
              onClose()
              onSuccess()
            }}
          >
            Create App
          </button>
        )
      : null,
}))

vi.mock('@/app/components/app/create-from-dsl-modal', () => ({
  default: ({ show, onClose, onSuccess }: { show: boolean, onClose: () => void, onSuccess: () => void }) =>
    show
      ? (
          <button
            type="button"
            data-testid="create-from-dsl-modal"
            onClick={() => {
              onClose()
              onSuccess()
            }}
          >
            Create from DSL
          </button>
        )
      : null,
}))

vi.mock('@/app/components/workflow/create-snippet-dialog', () => ({
  default: ({
    isOpen,
    onClose,
    onConfirm,
  }: {
    isOpen: boolean
    onClose: () => void
    onConfirm: (payload: {
      name: string
      description: string
      icon: { type: 'emoji', icon: string, background: string }
    }) => void
  }) =>
    isOpen
      ? (
          <button
            type="button"
            data-testid="create-snippet-dialog"
            onClick={() => {
              onConfirm({
                name: 'Created Snippet',
                description: '',
                icon: {
                  type: 'emoji',
                  icon: '🤖',
                  background: '#fff',
                },
              })
              onClose()
            }}
          >
            Create Snippet
          </button>
        )
      : null,
}))

vi.mock('../../nav', () => ({
  default: ({
    createText,
    curNav,
    isApp,
    link,
    onCreate,
    onLoadMore,
    navigationItems,
  }: {
    createText: string
    curNav?: { id: string, name: string }
    isApp?: boolean
    link: string
    onCreate: (state: string) => void
    onLoadMore?: () => void
    navigationItems?: Array<{ id: string, name: string, link: string }>
  }) => (
    <div data-testid="nav">
      <div data-testid="nav-link">{link}</div>
      <div data-testid="nav-is-app">{String(isApp)}</div>
      <div data-testid="nav-create-text">{createText}</div>
      <div data-testid="nav-current">{curNav ? `${curNav.id}:${curNav.name}` : ''}</div>
      <ul data-testid="nav-items">
        {(navigationItems ?? []).map(item => (
          <li key={item.id}>{`${item.name} -> ${item.link}`}</li>
        ))}
      </ul>
      <button type="button" onClick={() => onCreate('blank')} data-testid="create-blank">
        Create Blank
      </button>
      <button type="button" onClick={() => onCreate('template')} data-testid="create-template">
        Create Template
      </button>
      <button type="button" onClick={() => onCreate('dsl')} data-testid="create-dsl">
        Create DSL
      </button>
      <button type="button" onClick={onLoadMore} data-testid="load-more">
        Load More
      </button>
    </div>
  ),
}))

const mockAppData = [
  {
    id: 'app-1',
    name: 'App 1',
    mode: AppModeEnum.AGENT_CHAT,
    icon_type: 'emoji',
    icon: '🤖',
    icon_background: null,
    icon_url: null,
  },
]

const mockSnippetData = [
  {
    id: 'snippet-1',
    name: 'Snippet 1',
    description: '',
    icon_info: {
      icon_type: 'emoji',
      icon: '🧩',
      icon_background: '#fff',
      icon_url: null,
    },
    is_published: true,
    use_count: 0,
    created_at: 1,
    created_by: 'user-1',
    updated_at: 1,
    updated_by: 'user-1',
  },
  {
    id: 'snippet-2',
    name: 'Snippet 2',
    description: '',
    icon_info: {
      icon_type: 'emoji',
      icon: '⚙️',
      icon_background: '#000',
      icon_url: null,
    },
    is_published: true,
    use_count: 1,
    created_at: 1,
    created_by: 'user-1',
    updated_at: 1,
    updated_by: 'user-1',
  },
]

const mockUseParams = vi.mocked(useParams)
const mockUsePathname = vi.mocked(usePathname)
const mockUseRouter = vi.mocked(useRouter)
const mockUseAppContext = vi.mocked(useAppContext)
const mockUseAppStore = vi.mocked(useAppStore)
const mockUseInfiniteAppList = vi.mocked(useInfiniteAppList)
const mockUseInfiniteSnippetList = vi.mocked(useInfiniteSnippetList)
const mockUseSnippetApiDetail = vi.mocked(useSnippetApiDetail)
const mockUseCreateSnippetMutation = vi.mocked(useCreateSnippetMutation)
let mockAppDetail: { id: string, name: string } | null = null

const setupDefaultMocks = (options?: {
  hasNextPage?: boolean
  refetch?: () => void
  fetchNextPage?: () => void
  isEditor?: boolean
  appData?: typeof mockAppData
}) => {
  const refetch = options?.refetch ?? vi.fn()
  const fetchNextPage = options?.fetchNextPage ?? vi.fn()

  mockUseParams.mockReturnValue({ appId: 'app-1' } as ReturnType<typeof useParams>)
  mockUsePathname.mockReturnValue('/app/app-1/workflow')
  mockUseRouter.mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>)
  mockUseAppContext.mockReturnValue({ isCurrentWorkspaceEditor: options?.isEditor ?? false } as ReturnType<typeof useAppContext>)
  mockUseAppStore.mockImplementation((selector: unknown) => (selector as (state: { appDetail: { id: string, name: string } | null }) => unknown)({ appDetail: mockAppDetail }))
  mockUseInfiniteAppList.mockReturnValue({
    data: { pages: [{ data: options?.appData ?? mockAppData }] },
    fetchNextPage,
    hasNextPage: options?.hasNextPage ?? false,
    isFetchingNextPage: false,
    refetch,
  } as ReturnType<typeof useInfiniteAppList>)
  mockUseInfiniteSnippetList.mockReturnValue({
    data: undefined,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  } as unknown as ReturnType<typeof useInfiniteSnippetList>)
  mockUseSnippetApiDetail.mockReturnValue({
    data: undefined,
  } as ReturnType<typeof useSnippetApiDetail>)
  mockUseCreateSnippetMutation.mockReturnValue({
    isPending: false,
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useCreateSnippetMutation>)

  return { refetch, fetchNextPage }
}

const setupSnippetMocks = (options?: {
  fetchNextPage?: () => void
  hasNextPage?: boolean
  mutate?: ReturnType<typeof vi.fn>
}) => {
  const fetchNextPage = options?.fetchNextPage ?? vi.fn()
  const mutate = options?.mutate ?? vi.fn()

  setupDefaultMocks({ isEditor: true })
  mockUseParams.mockReturnValue({ snippetId: 'snippet-1' } as ReturnType<typeof useParams>)
  mockUsePathname.mockReturnValue('/snippets/snippet-1/orchestrate')
  mockUseInfiniteSnippetList.mockReturnValue({
    data: { pages: [{ data: mockSnippetData }] },
    fetchNextPage,
    hasNextPage: options?.hasNextPage ?? false,
    isFetchingNextPage: false,
  } as unknown as ReturnType<typeof useInfiniteSnippetList>)
  mockUseSnippetApiDetail.mockReturnValue({
    data: mockSnippetData[0],
  } as ReturnType<typeof useSnippetApiDetail>)
  mockUseCreateSnippetMutation.mockReturnValue({
    isPending: false,
    mutate,
  } as unknown as ReturnType<typeof useCreateSnippetMutation>)

  return { fetchNextPage, mutate }
}

describe('AppNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppDetail = null
    setupDefaultMocks()
  })

  it('should build editor links and update app name when app detail changes', async () => {
    setupDefaultMocks({
      isEditor: true,
      appData: [
        {
          id: 'app-1',
          name: 'App 1',
          mode: AppModeEnum.AGENT_CHAT,
          icon_type: 'emoji',
          icon: '🤖',
          icon_background: null,
          icon_url: null,
        },
        {
          id: 'app-2',
          name: 'App 2',
          mode: AppModeEnum.WORKFLOW,
          icon_type: 'emoji',
          icon: '⚙️',
          icon_background: null,
          icon_url: null,
        },
      ],
    })

    const { rerender } = render(<AppNav />)

    expect(screen.getByText('App 1 -> /app/app-1/configuration')).toBeInTheDocument()
    expect(screen.getByText('App 2 -> /app/app-2/workflow')).toBeInTheDocument()

    mockAppDetail = { id: 'app-1', name: 'Updated App Name' }
    rerender(<AppNav />)

    await waitFor(() => {
      expect(screen.getByText('Updated App Name -> /app/app-1/configuration')).toBeInTheDocument()
    })
  })

  it('should open and close create app modal, then refetch', async () => {
    const user = userEvent.setup()
    const { refetch } = setupDefaultMocks()
    render(<AppNav />)

    await user.click(screen.getByTestId('create-blank'))
    expect(screen.getByTestId('create-app-modal')).toBeInTheDocument()

    await user.click(screen.getByTestId('create-app-modal'))
    await waitFor(() => {
      expect(screen.queryByTestId('create-app-modal')).not.toBeInTheDocument()
      expect(refetch).toHaveBeenCalledTimes(1)
    })
  })

  it('should open and close template modal, then refetch', async () => {
    const user = userEvent.setup()
    const { refetch } = setupDefaultMocks()
    render(<AppNav />)

    await user.click(screen.getByTestId('create-template'))
    expect(screen.getByTestId('create-app-template-dialog')).toBeInTheDocument()

    await user.click(screen.getByTestId('create-app-template-dialog'))
    await waitFor(() => {
      expect(screen.queryByTestId('create-app-template-dialog')).not.toBeInTheDocument()
      expect(refetch).toHaveBeenCalledTimes(1)
    })
  })

  it('should open and close DSL modal, then refetch', async () => {
    const user = userEvent.setup()
    const { refetch } = setupDefaultMocks()
    render(<AppNav />)

    await user.click(screen.getByTestId('create-dsl'))
    expect(screen.getByTestId('create-from-dsl-modal')).toBeInTheDocument()

    await user.click(screen.getByTestId('create-from-dsl-modal'))
    await waitFor(() => {
      expect(screen.queryByTestId('create-from-dsl-modal')).not.toBeInTheDocument()
      expect(refetch).toHaveBeenCalledTimes(1)
    })
  })

  it('should load more when user clicks load more and more data is available', async () => {
    const user = userEvent.setup()
    const { fetchNextPage } = setupDefaultMocks({ hasNextPage: true })
    render(<AppNav />)

    await user.click(screen.getByTestId('load-more'))
    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })

  it('should not load more when user clicks load more and no data is available', async () => {
    const user = userEvent.setup()
    const { fetchNextPage } = setupDefaultMocks({ hasNextPage: false })
    render(<AppNav />)

    await user.click(screen.getByTestId('load-more'))
    expect(fetchNextPage).not.toHaveBeenCalled()
  })

  // Non-editor link path: isCurrentWorkspaceEditor=false → link ends with /overview
  it('should build overview links when user is not editor', () => {
    // Arrange
    setupDefaultMocks({ isEditor: false })

    // Act
    render(<AppNav />)

    // Assert
    expect(screen.getByText('App 1 -> /app/app-1/overview')).toBeInTheDocument()
  })

  // !!appId false: query disabled, no nav items
  it('should render no nav items when appId is undefined', () => {
    // Arrange
    setupDefaultMocks()
    mockUseParams.mockReturnValue({} as ReturnType<typeof useParams>)
    mockUseInfiniteAppList.mockReturnValue({
      data: undefined,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInfiniteAppList>)

    // Act
    render(<AppNav />)

    // Assert
    const navItems = screen.getByTestId('nav-items')
    expect(navItems.children).toHaveLength(0)
  })

  // ADVANCED_CHAT OR branch: editor + ADVANCED_CHAT mode → link ends with /workflow
  it('should build workflow link for ADVANCED_CHAT mode when user is editor', () => {
    // Arrange
    setupDefaultMocks({
      isEditor: true,
      appData: [
        {
          id: 'app-3',
          name: 'Chat App',
          mode: AppModeEnum.ADVANCED_CHAT,
          icon_type: 'emoji',
          icon: '💬',
          icon_background: null,
          icon_url: null,
        },
      ],
    })

    // Act
    render(<AppNav />)

    // Assert
    expect(screen.getByText('Chat App -> /app/app-3/workflow')).toBeInTheDocument()
  })

  // No-match update path: appDetail.id doesn't match any nav item
  it('should not change nav item names when appDetail id does not match any item', async () => {
    // Arrange
    setupDefaultMocks({ isEditor: true })
    const { rerender } = render(<AppNav />)

    // Act - set appDetail to a non-matching id
    mockAppDetail = { id: 'non-existent-id', name: 'Unknown' }
    rerender(<AppNav />)

    // Assert - original name should be unchanged
    await waitFor(() => {
      expect(screen.getByText('App 1 -> /app/app-1/configuration')).toBeInTheDocument()
    })
  })

  it('should switch the main nav to snippet list and render snippet items on snippet detail routes', () => {
    setupSnippetMocks()

    render(<AppNav />)

    expect(screen.getByTestId('nav-link')).toHaveTextContent('/snippets')
    expect(screen.getByTestId('nav-is-app')).toHaveTextContent('false')
    expect(screen.getByTestId('nav-current')).toHaveTextContent('snippet-1:Snippet 1')
    expect(screen.getByTestId('nav-create-text')).toHaveTextContent('createFromBlank')
    expect(screen.getByText('Snippet 1 -> /snippets/snippet-1/orchestrate')).toBeInTheDocument()
    expect(screen.getByText('Snippet 2 -> /snippets/snippet-2/orchestrate')).toBeInTheDocument()
  })

  it('should not show stale snippet detail as the current nav while switching snippets', () => {
    setupSnippetMocks()
    mockUseParams.mockReturnValue({ snippetId: 'snippet-2' } as ReturnType<typeof useParams>)
    mockUseSnippetApiDetail.mockReturnValue({
      data: mockSnippetData[0],
    } as ReturnType<typeof useSnippetApiDetail>)

    render(<AppNav />)

    expect(screen.getByTestId('nav-current')).toBeEmptyDOMElement()
  })

  it('should load more snippets from the snippet selector when more data is available', async () => {
    const user = userEvent.setup()
    const { fetchNextPage } = setupSnippetMocks({ hasNextPage: true })

    render(<AppNav />)

    await user.click(screen.getByTestId('load-more'))
    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })

  it('should open the create snippet dialog from snippet nav create action', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    setupSnippetMocks({ mutate })

    render(<AppNav />)

    await user.click(screen.getByTestId('create-blank'))
    expect(screen.getByTestId('create-snippet-dialog')).toBeInTheDocument()

    await user.click(screen.getByTestId('create-snippet-dialog'))
    expect(mutate).toHaveBeenCalledWith({
      body: {
        name: 'Created Snippet',
        description: undefined,
        icon_info: {
          icon: '🤖',
          icon_type: 'emoji',
          icon_background: '#fff',
          icon_url: undefined,
        },
      },
    }, expect.objectContaining({
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    }))
  })
})
