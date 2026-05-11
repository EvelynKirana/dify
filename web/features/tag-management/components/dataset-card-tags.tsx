import type { MouseEvent } from 'react'
import type { Tag } from '@/contract/console/tags'
import { cn } from '@langgenius/dify-ui/cn'
import { useState } from 'react'
import { TagSelector } from '@/features/tag-management/components/tag-selector'

type DatasetCardTagsProps = {
  datasetId: string
  embeddingAvailable: boolean
  tags: Tag[]
  onClick: (e: MouseEvent) => void
  onOpenTagManagement?: () => void
  onTagsChange?: () => void
}

export const DatasetCardTags = ({
  datasetId,
  embeddingAvailable,
  tags,
  onClick,
  onOpenTagManagement = () => {},
  onTagsChange,
}: DatasetCardTagsProps) => {
  const [selectorOpen, setSelectorOpen] = useState(false)

  return (
    <div
      className={cn('group/tag-area relative w-full px-3', !embeddingAvailable && 'opacity-30')}
      data-open={selectorOpen ? '' : undefined}
      onClick={onClick}
    >
      <div className="w-full">
        <TagSelector
          placement="bottom-start"
          type="knowledge"
          targetId={datasetId}
          value={tags}
          onManageTags={onOpenTagManagement}
          onActiveChange={setSelectorOpen}
          onTagsChange={onTagsChange}
        />
      </div>
      <div
        className="absolute top-0 right-0 h-full w-20 bg-tag-selector-mask-bg group-hover:bg-tag-selector-mask-hover-bg group-hover/tag-area:hidden group-data-open/tag-area:hidden"
      />
    </div>
  )
}
