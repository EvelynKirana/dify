import { z } from 'zod'

export const WorkspaceSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  status: z.string().default(''),
  current: z.boolean().default(false),
})
export type WorkspaceSummary = z.infer<typeof WorkspaceSummarySchema>

export const WorkspaceListResponseSchema = z.object({
  workspaces: z.array(WorkspaceSummarySchema).default([]),
})
export type WorkspaceListResponse = z.infer<typeof WorkspaceListResponseSchema>
