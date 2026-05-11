import type { Tag } from '@/contract/console/tags'
import { useState } from 'react'
import { TagSelector } from '@/features/tag-management/components/tag-selector'

type AppCardTagsProps = {
  appId: string
  tags: Tag[]
  onManageTags?: () => void
  onTagsChange?: () => void
}

export const AppCardTags = ({
  appId,
  tags,
  onManageTags = () => {},
  onTagsChange,
}: AppCardTagsProps) => {
  const [selectorOpen, setSelectorOpen] = useState(false)

  return (
    <div className="group/tag-area relative min-w-0 overflow-hidden" data-open={selectorOpen ? '' : undefined}>
      <TagSelector
        placement="bottom-start"
        type="app"
        targetId={appId}
        value={tags}
        onManageTags={onManageTags}
        onActiveChange={setSelectorOpen}
        onTagsChange={onTagsChange}
      />
      <div className="pointer-events-none absolute top-0 right-0 h-full w-20 bg-tag-selector-mask-bg group-hover:bg-tag-selector-mask-hover-bg group-hover/tag-area:hidden group-data-open/tag-area:hidden" />
    </div>
  )
}
