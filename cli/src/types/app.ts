import { z } from 'zod'

export const TagSchema = z.object({
  name: z.string(),
})
export type Tag = z.infer<typeof TagSchema>

export const ListRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  mode: z.string(),
  tags: z.array(TagSchema).default([]),
  updated_at: z.string().nullable().default(null),
  created_by_name: z.string().nullable().default(null),
  workspace_id: z.string().default(''),
  workspace_name: z.string().nullable().default(null),
})
export type ListRow = z.infer<typeof ListRowSchema>

export const ListResponseSchema = z.object({
  page: z.number().int().default(1),
  limit: z.number().int().default(20),
  total: z.number().int().default(0),
  has_more: z.boolean().default(false),
  data: z.array(ListRowSchema).default([]),
})
export type ListResponse = z.infer<typeof ListResponseSchema>

export const DescribeInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  mode: z.string(),
  author: z.string().default(''),
  tags: z.array(TagSchema).default([]),
  updated_at: z.string().nullable().default(null),
  service_api_enabled: z.boolean().default(false),
  is_agent: z.boolean().default(false),
})
export type DescribeInfo = z.infer<typeof DescribeInfoSchema>

export const DescribeResponseSchema = z.object({
  info: DescribeInfoSchema.nullable(),
  parameters: z.unknown().nullable().default(null),
  input_schema: z.unknown().nullable().default(null),
})
export type DescribeResponse = z.infer<typeof DescribeResponseSchema>

export const FieldInfo = 'info'
export const FieldParameters = 'parameters'
export const FieldInputSchema = 'input_schema'
