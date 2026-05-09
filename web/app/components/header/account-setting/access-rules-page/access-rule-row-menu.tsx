'use client'

import type { AccessPolicy } from '@/models/access-control'
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
import { useCopyAccessRule, useDeleteAccessRule } from '@/service/access-control/use-workspace-access-rules'

export type AccessRuleRowMenuProps = {
  rule: AccessPolicy
  onEdit?: () => void
}

const AccessRuleRowMenu = ({
  rule,
  onEdit,
}: AccessRuleRowMenuProps) => {
  const [open, setOpen] = useState(false)

  const { mutateAsync: copyAccessRule } = useCopyAccessRule(rule.resource_type)
  const { mutateAsync: deleteAccessRule } = useDeleteAccessRule(rule.resource_type)

  const handleCopyRules = useCallback(() => {
    copyAccessRule(rule.id, {
      onSuccess: () => {
        toast.success('Access rule copied successfully')
        setOpen(false)
      },
    })
  }, [copyAccessRule, rule.id])

  const handleDelete = useCallback(() => {
    deleteAccessRule(rule.id, {
      onSuccess: () => {
        toast.success('Access rule deleted successfully')
        setOpen(false)
      },
    })
  }, [deleteAccessRule, rule.id])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={(
          <ActionButton
            size="l"
            className={open ? 'bg-state-base-hover' : ''}
            aria-label="More actions"
          />
        )}
      >
        <span aria-hidden className="i-ri-more-fill h-4 w-4 text-text-tertiary" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        placement="bottom-end"
        sideOffset={4}
        popupClassName="min-w-[140px]"
      >
        <DropdownMenuItem
          className="system-sm-semibold text-text-secondary"
          onClick={onEdit}
        >
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="system-sm-semibold text-text-secondary"
          onClick={handleCopyRules}
        >
          Copy
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="system-sm-semibold"
          onClick={handleDelete}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default AccessRuleRowMenu
