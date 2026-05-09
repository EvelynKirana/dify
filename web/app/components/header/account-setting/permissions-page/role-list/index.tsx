'use client'

import type { Role, RoleCategory } from '@/models/access-control'
import { cn } from '@langgenius/dify-ui/cn'
import Row from './row'

export type RoleListGroup = {
  id: string
  category: RoleCategory
  title: string
  items: Role[]
}

export type RoleListProps = {
  groups: RoleListGroup[]
  className?: string
  onView?: (role: Role) => void
  onEdit?: (role: Role) => void
}

const RoleList = ({
  groups,
  className,
  onView,
  onEdit,
}: RoleListProps) => {
  return (
    <div className={cn('flex flex-col', className)}>
      {groups.map((group, groupIndex) => (
        <section
          key={group.id}
          className={cn(groupIndex > 0 && 'mt-6')}
        >
          <h3 className="mb-2 pr-3 system-xs-medium-uppercase tracking-wide text-text-tertiary">
            {group.title}
          </h3>
          <div className="overflow-hidden">
            {group.items.map((row, rowIndex) => (
              <Row
                key={row.id}
                className={cn(
                  rowIndex > 0 && 'border-t border-divider-subtle',
                )}
                name={row.name}
                description={row.description}
                roleCategory={group.category}
                role={row}
                onView={onView}
                onEdit={onEdit}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default RoleList
