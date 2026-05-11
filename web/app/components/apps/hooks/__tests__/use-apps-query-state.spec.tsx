import { act, waitFor } from '@testing-library/react'
import { renderHookWithNuqs } from '@/test/nuqs-testing'
import { AppModeEnum } from '@/types/app'
import { APP_LIST_SEARCH_DEBOUNCE_MS } from '../../constants'
import { useAppsQueryState } from '../use-apps-query-state'

const renderWithAdapter = (searchParams = '') => {
  return renderHookWithNuqs(() => useAppsQueryState(), { searchParams })
}

describe('useAppsQueryState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should expose app list query state actions', () => {
    const { result } = renderWithAdapter()

    expect(result.current.query).toEqual({
      category: 'all',
      tagNames: [],
      keywords: '',
      isCreatedByMe: false,
    })
    expect(typeof result.current.setCategory).toBe('function')
    expect(typeof result.current.setKeywords).toBe('function')
    expect(typeof result.current.setTagNames).toBe('function')
    expect(typeof result.current.setIsCreatedByMe).toBe('function')
  })

  it('should parse app list filters from URL', () => {
    const { result } = renderWithAdapter(
      '?category=workflow&tags=Frontend;Backend&keywords=search+term&isCreatedByMe=true',
    )

    expect(result.current.query).toEqual({
      category: AppModeEnum.WORKFLOW,
      tagNames: ['Frontend', 'Backend'],
      keywords: 'search term',
      isCreatedByMe: true,
    })
  })

  it('should update category URL state', async () => {
    const { result, onUrlUpdate } = renderWithAdapter()

    act(() => {
      result.current.setCategory(AppModeEnum.WORKFLOW)
    })

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled())
    const update = onUrlUpdate.mock.calls.at(-1)![0]
    expect(result.current.query.category).toBe(AppModeEnum.WORKFLOW)
    expect(update.searchParams.get('category')).toBe(AppModeEnum.WORKFLOW)
    expect(update.options.history).toBe('push')
  })

  it('should remove category from URL when set to all', async () => {
    const { result, onUrlUpdate } = renderWithAdapter('?category=workflow')

    act(() => {
      result.current.setCategory('all')
    })

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled())
    const update = onUrlUpdate.mock.calls.at(-1)![0]
    expect(result.current.query.category).toBe('all')
    expect(update.searchParams.has('category')).toBe(false)
  })

  it('should update keywords state immediately while debouncing URL writes', async () => {
    vi.useFakeTimers()
    try {
      const { result, onUrlUpdate } = renderWithAdapter()

      act(() => {
        result.current.setKeywords('search')
      })

      expect(result.current.query.keywords).toBe('search')
      expect(onUrlUpdate).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(APP_LIST_SEARCH_DEBOUNCE_MS + 100)
      })

      expect(onUrlUpdate).toHaveBeenCalled()
      const update = onUrlUpdate.mock.calls.at(-1)![0]
      expect(update.searchParams.get('keywords')).toBe('search')
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('should remove keywords from URL when cleared', async () => {
    vi.useFakeTimers()
    try {
      const { result, onUrlUpdate } = renderWithAdapter('?keywords=existing')

      act(() => {
        result.current.setKeywords('')
      })

      expect(result.current.query.keywords).toBe('')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(APP_LIST_SEARCH_DEBOUNCE_MS + 100)
      })

      expect(onUrlUpdate).toHaveBeenCalled()
      const update = onUrlUpdate.mock.calls.at(-1)![0]
      expect(update.searchParams.has('keywords')).toBe(false)
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('should update tag filter URL state', async () => {
    const { result, onUrlUpdate } = renderWithAdapter()

    act(() => {
      result.current.setTagNames(['Frontend', 'Backend'])
    })

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled())
    const update = onUrlUpdate.mock.calls.at(-1)![0]
    expect(result.current.query.tagNames).toEqual(['Frontend', 'Backend'])
    expect(update.searchParams.get('tags')).toBe('Frontend;Backend')
    expect(update.options.history).toBe('push')
  })

  it('should remove tags from URL when empty', async () => {
    const { result, onUrlUpdate } = renderWithAdapter('?tags=Frontend;Backend')

    act(() => {
      result.current.setTagNames([])
    })

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled())
    const update = onUrlUpdate.mock.calls.at(-1)![0]
    expect(result.current.query.tagNames).toEqual([])
    expect(update.searchParams.has('tags')).toBe(false)
  })

  it('should update created-by-me URL state', async () => {
    const { result, onUrlUpdate } = renderWithAdapter()

    act(() => {
      result.current.setIsCreatedByMe(true)
    })

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled())
    const update = onUrlUpdate.mock.calls.at(-1)![0]
    expect(result.current.query.isCreatedByMe).toBe(true)
    expect(update.searchParams.get('isCreatedByMe')).toBe('true')
    expect(update.options.history).toBe('push')
  })

  it('should remove isCreatedByMe from URL when disabled', async () => {
    const { result, onUrlUpdate } = renderWithAdapter('?isCreatedByMe=true')

    act(() => {
      result.current.setIsCreatedByMe(false)
    })

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled())
    const update = onUrlUpdate.mock.calls.at(-1)![0]
    expect(result.current.query.isCreatedByMe).toBe(false)
    expect(update.searchParams.has('isCreatedByMe')).toBe(false)
  })
})
