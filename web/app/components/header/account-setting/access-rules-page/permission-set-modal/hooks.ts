import type { AccessPolicyResourceType } from '@/models/access-control'
import { useAppPermissionCatalog, useDatasetPermissionCatalog } from '@/service/access-control/use-permission-catalog'

export const usePermissionsGroups = (resourceType: AccessPolicyResourceType) => {
  const { data: appPermissionCatalog } = useAppPermissionCatalog(resourceType === 'app')
  const { data: datasetPermissionCatalog } = useDatasetPermissionCatalog(resourceType === 'dataset')

  const permissionCatalog = resourceType === 'app' ? appPermissionCatalog : datasetPermissionCatalog

  const groups = permissionCatalog?.groups || []

  const allPermissions = groups.flatMap(g => g.permissions) || []

  const permissionMap = Object.fromEntries(
    allPermissions.map(p => [p.key, p]),
  )

  return {
    groups,
    permissionMap,
  }
}
