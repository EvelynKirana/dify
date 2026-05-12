'use client'

import type { AccessPolicyWithBindings, BindingType } from '@/models/access-control'
import { cn } from '@langgenius/dify-ui/cn'
import { toast } from '@langgenius/dify-ui/toast'
import { memo, useCallback } from 'react'
import {
  useUpdateAppAccessRuleBindings,
  useUpdateDatasetAccessRuleBindings,
} from '@/service/access-control/use-workspace-access-rules'
import AccessRuleRowMenu from './access-rule-row-menu'
import RoleTag from './role-tag'

export type AccessRuleRowProps = {
  rule: AccessPolicyWithBindings
  className?: string
  showMenu?: boolean
  onEdit?: (rule: AccessPolicyWithBindings) => void
  onAddRole?: (rule: AccessPolicyWithBindings) => void
}

const AccessRuleRow = ({
  rule,
  className,
  showMenu = true,
  onEdit,
  onAddRole,
}: AccessRuleRowProps) => {
  const { policy, roles, accounts } = rule
  const { id: policyId, resource_type } = policy

  const handleEdit = useCallback(() => onEdit?.(rule), [onEdit, rule])
  const handleAddRole = useCallback(() => onAddRole?.(rule), [onAddRole, rule])

  const { mutateAsync: updateAppAccessRuleBindings } = useUpdateAppAccessRuleBindings()
  const { mutateAsync: updateDatasetAccessRuleBindings } = useUpdateDatasetAccessRuleBindings()

  const handleRemoveRole = useCallback((id: string, type: BindingType) => {
    const payload = {
      id: policyId,
      role_ids: roles.map(role => role.role_id),
      account_ids: accounts.map(account => account.account_id),
    }
    if (type === 'role') {
      payload.role_ids = payload.role_ids.filter(roleId => roleId !== id)
    }
    else if (type === 'account') {
      payload.account_ids = payload.account_ids.filter(accountId => accountId !== id)
    }
    if (resource_type === 'app') {
      updateAppAccessRuleBindings(payload, {
        onSuccess: () => {
          toast.success('Access rule updated successfully')
        },
      })
    }
    else if (resource_type === 'dataset') {
      updateDatasetAccessRuleBindings(payload, {
        onSuccess: () => {
          toast.success('Access rule updated successfully')
        },
      })
    }
  }, [accounts, policyId, resource_type, roles, updateAppAccessRuleBindings, updateDatasetAccessRuleBindings])

  return (
    <div className={cn('flex items-start gap-2 py-3.5', className)}>
      <div className="min-w-0 flex-1">
        <div className="system-sm-semibold text-text-secondary">
          {policy.name}
        </div>
        <p className="mt-0.5 system-xs-regular text-text-tertiary">
          {policy.description}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {roles.map(role => (
            <RoleTag
              key={role.role_id}
              id={role.role_id}
              label={role.role_name}
              type="role"
              onRemove={handleRemoveRole}
            />
          ))}
          {accounts.map(account => (
            <RoleTag
              key={account.account_id}
              id={account.account_id}
              label={account.account_name}
              type="account"
              onRemove={handleRemoveRole}
            />
          ))}
          <button
            type="button"
            onClick={handleAddRole}
            className="inline-flex h-6 items-center gap-0.5 rounded-md border border-divider-deep px-1.5 system-xs-medium text-text-tertiary hover:border-divider-solid hover:text-text-secondary"
            aria-label={`Add role to ${policy.name}`}
          >
            <span aria-hidden className="i-ri-add-line h-3 w-3" />
            Add
          </button>
        </div>
      </div>
      {showMenu && (
        <AccessRuleRowMenu
          onEdit={handleEdit}
          rule={policy}
        />
      )}
    </div>
  )
}

export default memo(AccessRuleRow)
