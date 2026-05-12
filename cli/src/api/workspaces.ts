import type { KyInstance } from 'ky'
import type { WorkspaceListResponse } from '../types/workspace.js'
import { WorkspaceListResponseSchema } from '../types/workspace.js'

export class WorkspacesClient {
  private readonly http: KyInstance

  constructor(http: KyInstance) {
    this.http = http
  }

  async list(): Promise<WorkspaceListResponse> {
    const raw = await this.http.get('workspaces').json()
    return WorkspaceListResponseSchema.parse(raw)
  }
}
