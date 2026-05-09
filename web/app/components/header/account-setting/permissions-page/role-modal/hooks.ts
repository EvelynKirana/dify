import { useWorkspacePermissionCatalog } from '@/service/access-control/use-permission-catalog'

export const useWorkspacePermissionGroups = () => {
  const { data: workspacePermissionCatalog } = useWorkspacePermissionCatalog()

  const groups = workspacePermissionCatalog?.groups || []

  const allPermissions = groups.flatMap(g => g.permissions) || []

  const permissionMap = Object.fromEntries(
    allPermissions.map(p => [p.key, p]),
  )

  return {
    groups,
    permissionMap,
  }
}
