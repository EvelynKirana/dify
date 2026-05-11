'use client'

import type { PermissionSetFormValues, PermissionSetModalMode } from './permission-set-modal'
import type { AccessPolicyResourceType, AccessPolicyWithBindings } from '@/models/access-control'
import { toast } from '@langgenius/dify-ui/toast'
import { useCallback, useState } from 'react'
import { useCreateAccessRule, useUpdateAppAccessRuleBindings, useUpdateDatasetAccessRuleBindings } from '@/service/access-control/use-workspace-access-rules'
import AddRuleTargetsModal from './add-rule-targets-modal'
import AppAccessRuleSection from './app-access-rule-section'
import DatasetAccessRuleSection from './dataset-access-rule-section'
import PermissionSetModal from './permission-set-modal'

type PermissionSetModalState = {
  mode: PermissionSetModalMode
  resourceType: AccessPolicyResourceType
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
        initialValues: {
          name: policy.name,
          description: policy.description,
          permissionKeys: policy.permission_keys,
        },
      })
    },
    [],
  )

  const { mutateAsync: createAccessRule } = useCreateAccessRule(permissionSetModalState?.resourceType)

  const handlePermissionSetSubmit = useCallback(
    (values: PermissionSetFormValues) => {
      const { name, description, permissionKeys } = values
      createAccessRule({
        name,
        description,
        permission_keys: permissionKeys,
      }, {
        onSuccess: () => {
          toast.success('Access rule created successfully')
          closePermissionSetModal()
        },
      })
    },
    [closePermissionSetModal, createAccessRule],
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
          initialRoleIds={addingRule.role_ids.map(role => role.id)}
          initialMemberIds={addingRule.account_ids.map(account => account.id)}
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
