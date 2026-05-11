import type { Tag } from '@/contract/console/tags'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppCardTags } from '../app-card-tags'

const renderTagSelector = vi.hoisted(() => vi.fn())

vi.mock('@/features/tag-management/components/tag-selector', () => ({
  TagSelector: (props: {
    onManageTags?: () => void
    onTagsChange?: () => void
    onActiveChange?: (active: boolean) => void
    placement: string
    targetId: string
    type: string
    value: Tag[]
  }) => {
    renderTagSelector(props)

    return (
      <div role="group" aria-label="Tag selector mock">
        <span>{props.value.map(tag => tag.name).join(',')}</span>
        <button type="button" onClick={props.onManageTags}>Manage Tags</button>
        <button type="button" onClick={props.onTagsChange}>Tags Changed</button>
        <button type="button" onClick={() => props.onActiveChange?.(true)}>Open Selector</button>
        <button type="button" onClick={() => props.onActiveChange?.(false)}>Close Selector</button>
      </div>
    )
  },
}))

const tags: Tag[] = [
  { id: 'tag-1', name: 'Frontend', type: 'app', binding_count: 1 },
  { id: 'tag-2', name: 'Backend', type: 'app', binding_count: 2 },
]

describe('AppCardTags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render TagSelector with app tag bindings', () => {
      render(<AppCardTags appId="app-1" tags={tags} />)

      expect(screen.getByRole('group', { name: 'Tag selector mock' })).toBeInTheDocument()
      expect(screen.getByText('Frontend,Backend')).toBeInTheDocument()
      expect(renderTagSelector).toHaveBeenCalledWith(expect.objectContaining({
        placement: 'bottom-start',
        targetId: 'app-1',
        type: 'app',
        value: tags,
      }))
    })
  })

  describe('Callbacks', () => {
    it('should forward tag management and tag change callbacks', () => {
      const onOpenTagManagement = vi.fn()
      const onTagsChange = vi.fn()

      render(
        <AppCardTags
          appId="app-1"
          tags={tags}
          onOpenTagManagement={onOpenTagManagement}
          onTagsChange={onTagsChange}
        />,
      )

      fireEvent.click(screen.getByText('Manage Tags'))
      fireEvent.click(screen.getByText('Tags Changed'))

      expect(onOpenTagManagement).toHaveBeenCalledTimes(1)
      expect(onTagsChange).toHaveBeenCalledTimes(1)
    })

    it('should mark the tag area as open only while the selector is open', () => {
      const { container } = render(<AppCardTags appId="app-1" tags={tags} />)
      const wrapper = container.firstElementChild
      if (!wrapper)
        throw new Error('Expected app card tag wrapper')

      expect(wrapper).not.toHaveAttribute('data-open')

      fireEvent.click(screen.getByText('Open Selector'))
      expect(wrapper).toHaveAttribute('data-open', '')

      fireEvent.click(screen.getByText('Close Selector'))
      expect(wrapper).not.toHaveAttribute('data-open')
    })
  })

  describe('Edge Cases', () => {
    it('should pass an empty selection when the app has no tags', () => {
      render(<AppCardTags appId="app-1" tags={[]} />)

      expect(renderTagSelector).toHaveBeenCalledWith(expect.objectContaining({
        value: [],
      }))
    })
  })
})
