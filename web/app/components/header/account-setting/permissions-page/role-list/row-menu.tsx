'use client'
import type { Role, RoleCategory } from '@/models/access-control'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { toast } from '@langgenius/dify-ui/toast'
import { useCallback, useState } from 'react'
import ActionButton from '@/app/components/base/action-button'
import { useCopyWorkspaceRole, useDeleteWorkspaceRole } from '@/service/access-control/use-workspace-roles'

type RowMenuProps = {
  roleCategory: RoleCategory
  role: Role
  onView?: (role: Role) => void
  onEdit?: (role: Role) => void
}

const RowMenu = ({
  roleCategory,
  role,
  onView,
  onEdit,
}: RowMenuProps) => {
  const [open, setOpen] = useState(false)

  const handleView = useCallback(() => onView?.(role), [onView, role])

  const handleEdit = useCallback(() => onEdit?.(role), [onEdit, role])

  const { mutateAsync: copyRole } = useCopyWorkspaceRole()

  const handleDuplicate = useCallback(() => {
    copyRole(role.id, {
      onSuccess: () => {
        toast.success('Role duplicated successfully')
        setOpen(false)
      },
    })
  }, [copyRole, role.id])

  const { mutateAsync: deleteRole } = useDeleteWorkspaceRole()

  const handleDelete = useCallback(() => {
    deleteRole(role.id, {
      onSuccess: () => {
        toast.success('Role deleted successfully')
        setOpen(false)
      },
    })
  }, [deleteRole, role.id])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={<ActionButton size="l" className={open ? 'bg-state-base-hover' : ''} aria-label="More actions" />}>
        <span aria-hidden className="i-ri-more-fill h-4 w-4 text-text-tertiary" />
      </DropdownMenuTrigger>
      <DropdownMenuContent placement="bottom-end" sideOffset={4} popupClassName="min-w-[160px]">
        {
          roleCategory === 'global_system_default' && (
            <DropdownMenuItem className="system-sm-semibold text-text-secondary" onClick={handleView}>
              View
            </DropdownMenuItem>
          )
        }
        {
          roleCategory === 'global_custom' && (
            <>
              <DropdownMenuItem className="system-sm-semibold text-text-secondary" onClick={handleEdit}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="system-sm-semibold text-text-secondary" onClick={handleDuplicate}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" className="system-sm-semibold" onClick={handleDelete}>
                Delete
              </DropdownMenuItem>
            </>
          )
        }
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default RowMenu
