import type {
  AccessPolicy,
  AccessPolicyResourceType,
  Bindings,
  CreateAccessPolicyRequest,
  GetAppAccessPoliciesResponse,
  GetDatasetAccessPoliciesResponse,
  PaginationParameters,
  UpdateAccessPolicyRequest,
} from '@/models/access-control'
import type { CommonResponse } from '@/models/common'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { del, get, post, put } from '../base'

const NAME_SPACE = 'workspace-access-rules'

export const useWorkspaceAppAccessRules = (params?: PaginationParameters) => {
  return useQuery({
    queryKey: [NAME_SPACE, 'app', params],
    queryFn: () => get<GetAppAccessPoliciesResponse>('/workspaces/current/rbac/workspace/apps/access-policy', { params }),
  })
}

export const useWorkspaceDatasetAccessRules = (params?: PaginationParameters) => {
  return useQuery({
    queryKey: [NAME_SPACE, 'dataset', params],
    queryFn: () => get<GetDatasetAccessPoliciesResponse>('/workspaces/current/rbac/workspace/datasets/access-policy', { params }),
  })
}

export const useCreateAccessRule = (resourceType?: AccessPolicyResourceType) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [NAME_SPACE, 'create', resourceType],
    mutationFn: (data: CreateAccessPolicyRequest) => {
      const { name, description, permission_keys } = data
      return post<AccessPolicy>('/workspaces/current/rbac/access-policies', {
        body: {
          resource_type: resourceType,
          name,
          description,
          permission_keys,
        },
      })
    },
    onSuccess: () => {
      if (resourceType) {
        queryClient.invalidateQueries({ queryKey: [NAME_SPACE, resourceType] })
      }
    },
  })
}

export const useUpdateAccessRule = (resourceType: AccessPolicyResourceType) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [NAME_SPACE, 'update', resourceType],
    mutationFn: (data: UpdateAccessPolicyRequest) => {
      const { id, name, description, permission_keys } = data
      return put<AccessPolicy>(`/workspaces/current/rbac/access-policies/${id}`, {
        body: {
          id,
          name,
          description,
          permission_keys,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NAME_SPACE, resourceType] })
    },
  })
}

export const useCopyAccessRule = (resourceType: AccessPolicyResourceType) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [NAME_SPACE, 'copy', resourceType],
    mutationFn: (id: string) => {
      return post<AccessPolicy>(`/workspaces/current/rbac/access-policies/${id}/copy`, {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NAME_SPACE, resourceType] })
    },
  })
}

export const useDeleteAccessRule = (resourceType: AccessPolicyResourceType) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [NAME_SPACE, 'delete', resourceType],
    mutationFn: (id: string) => {
      return del<CommonResponse>(`/workspaces/current/rbac/access-policies/${id}`, {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NAME_SPACE, resourceType] })
    },
  })
}

export const useUpdateAppAccessRuleBindings = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [NAME_SPACE, 'update-app-bindings'],
    mutationFn: (data: Bindings & { id: string }) => {
      const { id, ...rest } = data
      return put(`/workspaces/current/rbac/workspace/apps/access-policies/${id}/bindings`, {
        body: {
          ...rest,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NAME_SPACE, 'app'] })
    },
  })
}

export const useUpdateDatasetAccessRuleBindings = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [NAME_SPACE, 'update-dataset-bindings'],
    mutationFn: (data: Bindings & { id: string }) => {
      const { id, ...rest } = data
      return put(`/workspaces/current/rbac/workspace/datasets/access-policies/${id}/bindings`, {
        body: {
          ...rest,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NAME_SPACE, 'dataset'] })
    },
  })
}
