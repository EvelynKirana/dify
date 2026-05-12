import { z } from 'zod'

export const SessionRowSchema = z.object({
  id: z.string(),
  prefix: z.string().default(''),
  client_id: z.string().default(''),
  device_label: z.string().default(''),
  created_at: z.string().nullable().default(''),
  last_used_at: z.string().nullable().default(''),
  expires_at: z.string().nullable().default(''),
})
export type SessionRow = z.infer<typeof SessionRowSchema>

export const SessionListResponseSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  has_more: z.boolean(),
  data: z.array(SessionRowSchema),
})
export type SessionListResponse = z.infer<typeof SessionListResponseSchema>
