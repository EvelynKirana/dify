import type { RoleListGroup } from './role-list'
import type { RoleListResponse } from '@/models/access-control'

export const formatRoleGroups = (roleListResponse: RoleListResponse | undefined): RoleListGroup[] => {
  if (!roleListResponse)
    return []
  const result: RoleListGroup[] = []
  const builtinRoles = roleListResponse.data.filter(role => role.is_builtin)
  const customRoles = roleListResponse.data.filter(role => !role.is_builtin)
  if (builtinRoles.length > 0) {
    result.push({
      id: 'builtin',
      category: 'global_system_default',
      title: 'System Roles',
      items: builtinRoles,
    })
  }
  if (customRoles.length > 0) {
    result.push({
      id: 'custom',
      category: 'global_custom',
      title: 'Custom Roles',
      items: customRoles,
    })
  }
  return result
}
