import type { QueryClient } from '@tanstack/react-query'
import { isServer } from '@/utils/client'
import { makeQueryClient } from './query-client-server'

let browserQueryClient: QueryClient | undefined

export function getQueryClient() {
  if (isServer)
    return makeQueryClient()

  if (!browserQueryClient)
    browserQueryClient = makeQueryClient()

  return browserQueryClient
}
