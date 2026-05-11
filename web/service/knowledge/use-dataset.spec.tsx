import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { get } from '../base'
import { useDatasetList, useInfiniteDatasets } from './use-dataset'

vi.mock('../base', () => ({
  get: vi.fn(),
  post: vi.fn(),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

const datasetListResponse = {
  data: [],
  has_more: false,
  limit: 20,
  page: 1,
  total: 0,
}

describe('dataset list hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(get).mockResolvedValue(datasetListResponse)
  })

  it('serializes dataset list filters with tag names', async () => {
    renderHook(
      () => useDatasetList({
        initialPage: 1,
        limit: 20,
        tag_names: ['Finance', 'Support'],
      }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/datasets?tag_names=Finance&tag_names=Support&limit=20&page=1')
    })
  })

  it('normalizes infinite dataset list filters with tag names', async () => {
    renderHook(
      () => useInfiniteDatasets({
        page: 2,
        limit: 10,
        tag_names: ['Finance'],
      }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/datasets?page=2&limit=10&tag_names=Finance')
    })
  })
})
