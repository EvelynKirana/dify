import type { KyInstance } from 'ky'
import type { SessionListResponse } from '../types/account-session.js'
import { SessionListResponseSchema } from '../types/account-session.js'

export class AccountSessionsClient {
  private readonly http: KyInstance

  constructor(http: KyInstance) {
    this.http = http
  }

  async list(): Promise<SessionListResponse> {
    const raw = await this.http.get('account/sessions').json()
    return SessionListResponseSchema.parse(raw)
  }

  async revoke(sessionId: string): Promise<void> {
    await this.http.delete(`account/sessions/${encodeURIComponent(sessionId)}`)
  }

  async revokeSelf(): Promise<void> {
    await this.http.delete('account/sessions/self')
  }
}
