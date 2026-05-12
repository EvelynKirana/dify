import type { KyInstance } from 'ky'
import type { AccountResponse } from '../types/account.js'
import { AccountResponseSchema } from '../types/account.js'

export class AccountClient {
  private readonly http: KyInstance

  constructor(http: KyInstance) {
    this.http = http
  }

  async get(): Promise<AccountResponse> {
    const raw = await this.http.get('account').json()
    return AccountResponseSchema.parse(raw)
  }
}
