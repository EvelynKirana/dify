'use client'

import type { PermissionSetFormValues, PermissionSetModalMode } from './permission-set-modal'
import type { AccessPolicyResourceType, AccessPolicyWithBindings } from '@/models/access-control'
import { toast } from '@langgenius/dify-ui/toast'
import { useCallback, useState } from 'react'
import { useCreateAccessRule, useUpdateAccessRule, useUpdateAppAccessRuleBindings, useUpdateDatasetAccessRuleBindings } from '@/service/access-control/use-workspace-access-rules'
import AddRuleTargetsModal from './add-rule-targets-modal'
import AppAccessRuleSection from './app-access-rule-section'
import DatasetAccessRuleSection from './dataset-access-rule-section'
import PermissionSetModal from './permission-set-modal'

type PermissionSetModalState = {
  mode: PermissionSetModalMode
  resourceType: AccessPolicyResourceType
  ruleId?: string
  initialValues?: PermissionSetFormValues
}

const AccessRulesPage = () => {
  const [addingRule, setAddingRule] = useState<AccessPolicyWithBindings | null>(null)
  const [permissionSetModalState, setPermissionSetModalState]
    = useState<PermissionSetModalState | null>(null)

  const closeAddModal = useCallback(() => {
    setAddingRule(null)
  }, [])

  const closePermissionSetModal = useCallback(() => {
    setPermissionSetModalState(null)
  }, [])

  const handleAddRole = useCallback((rule: AccessPolicyWithBindings) => {
    setAddingRule(rule)
  }, [])

  const { mutateAsync: updateAppAccessRuleBindings } = useUpdateAppAccessRuleBindings()
  const { mutateAsync: updateDatasetAccessRuleBindings } = useUpdateDatasetAccessRuleBindings()

  const handleAddSubmit = useCallback(
    (selection: { roleIds: string[], memberIds: string[] }) => {
      const { id, resource_type } = addingRule!.policy
      const payload = {
        id,
        role_ids: selection.roleIds,
        account_ids: selection.memberIds,
      }
      if (resource_type === 'app') {
        updateAppAccessRuleBindings(payload, {
          onSuccess: () => {
            toast.success('Access rule updated successfully')
            closeAddModal()
          },
        })
      }
      else if (resource_type === 'dataset') {
        updateDatasetAccessRuleBindings(payload, {
          onSuccess: () => {
            toast.success('Access rule updated successfully')
            closeAddModal()
          },
        })
      }
    },
    [addingRule, closeAddModal, updateAppAccessRuleBindings, updateDatasetAccessRuleBindings],
  )

  const handleCreate = useCallback((resourceType: AccessPolicyResourceType) => {
    setPermissionSetModalState({ mode: 'create', resourceType })
  }, [])

  const handleEdit = useCallback(
    (resourceType: AccessPolicyResourceType, rule: AccessPolicyWithBindings) => {
      const { policy } = rule
      setPermissionSetModalState({
        mode: 'edit',
        resourceType,
        ruleId: policy.id,
        initialValues: {
          name: policy.name,
          description: policy.description,
          permissionKeys: policy.permission_keys,
        },
      })
    },
    [],
  )

  const { mutateAsync: createAccessRule } = useCreateAccessRule()
  const { mutateAsync: updateAccessRule } = useUpdateAccessRule()

  const handlePermissionSetSubmit = useCallback(
    (values: PermissionSetFormValues) => {
      const mode = permissionSetModalState?.mode || ''
      const id = permissionSetModalState?.ruleId || ''
      const { name, description, permissionKeys } = values
      if (mode === 'create') {
        createAccessRule({
          name,
          description,
          permission_keys: permissionKeys,
          resourceType: permissionSetModalState!.resourceType,
        }, {
          onSuccess: () => {
            toast.success('Access rule created successfully')
            closePermissionSetModal()
          },
        })
      }
      else if (mode === 'edit') {
        updateAccessRule({
          id: id!,
          name,
          description,
          permission_keys: permissionKeys,
          resourceType: permissionSetModalState!.resourceType,
        }, {
          onSuccess: () => {
            toast.success('Access rule updated successfully')
            closePermissionSetModal()
          },
        })
      }
    },
    [closePermissionSetModal, createAccessRule, updateAccessRule, permissionSetModalState],
  )

  const createApp = useCallback(() => handleCreate('app'), [handleCreate])
  const createKb = useCallback(() => handleCreate('dataset'), [handleCreate])
  const editApp = useCallback(
    (rule: AccessPolicyWithBindings) => handleEdit('app', rule),
    [handleEdit],
  )
  const editKb = useCallback(
    (rule: AccessPolicyWithBindings) => handleEdit('dataset', rule),
    [handleEdit],
  )

  return (
    <>
      <div className="flex flex-col gap-6">
        <AppAccessRuleSection
          onCreate={createApp}
          onEditRule={editApp}
          onAddRole={handleAddRole}
        />
        <DatasetAccessRuleSection
          onCreate={createKb}
          onEditRule={editKb}
          onAddRole={handleAddRole}
        />
      </div>
      {addingRule && (
        <AddRuleTargetsModal
          ruleName={addingRule.policy.name}
          initialRoleIds={addingRule.roles.map(role => role.role_id)}
          initialMemberIds={addingRule.accounts.map(account => account.account_id)}
          onClose={closeAddModal}
          onSubmit={handleAddSubmit}
        />
      )}
      {permissionSetModalState && (
        <PermissionSetModal
          open
          mode={permissionSetModalState.mode}
          resourceType={permissionSetModalState.resourceType}
          initialValues={permissionSetModalState.initialValues}
          onClose={closePermissionSetModal}
          onSubmit={handlePermissionSetSubmit}
        />
      )}
    </>
  )
}

export default AccessRulesPage
