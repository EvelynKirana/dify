import { z } from 'zod'

export const AccountInfoSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
})
export type AccountInfo = z.infer<typeof AccountInfoSchema>

export const AccountWorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().default(''),
})
export type AccountWorkspace = z.infer<typeof AccountWorkspaceSchema>

export const AccountResponseSchema = z.object({
  subject_type: z.enum(['account', 'external_sso']),
  subject_email: z.string().nullable().default(null),
  subject_issuer: z.string().nullable().optional(),
  account: AccountInfoSchema.nullable(),
  workspaces: z.array(AccountWorkspaceSchema).default([]),
  default_workspace_id: z.string().nullable().default(null),
})
export type AccountResponse = z.infer<typeof AccountResponseSchema>
