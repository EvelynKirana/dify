import type { KyInstance } from 'ky'
import type { DescribeResponse, ListResponse } from '../types/app.js'
import { DescribeResponseSchema, ListResponseSchema } from '../types/app.js'

export type ListQuery = {
  readonly workspaceId: string
  readonly page?: number
  readonly limit?: number
  readonly mode?: string
  readonly name?: string
  readonly tag?: string
}

export class AppsClient {
  private readonly http: KyInstance

  constructor(http: KyInstance) {
    this.http = http
  }

  async list(q: ListQuery): Promise<ListResponse> {
    const params = new URLSearchParams()
    params.set('workspace_id', q.workspaceId)
    params.set('page', String(q.page ?? 1))
    params.set('limit', String(q.limit ?? 20))
    if (q.mode !== undefined && q.mode !== '')
      params.set('mode', q.mode)
    if (q.name !== undefined && q.name !== '')
      params.set('name', q.name)
    if (q.tag !== undefined && q.tag !== '')
      params.set('tag', q.tag)
    const raw = await this.http.get('apps', { searchParams: params }).json()
    return ListResponseSchema.parse(raw)
  }

  async describe(appId: string, workspaceId: string, fields?: readonly string[]): Promise<DescribeResponse> {
    const params = new URLSearchParams()
    params.set('workspace_id', workspaceId)
    if (fields !== undefined && fields.length > 0)
      params.set('fields', fields.join(','))
    const raw = await this.http.get(`apps/${encodeURIComponent(appId)}/describe`, { searchParams: params }).json()
    return DescribeResponseSchema.parse(raw)
  }
}
