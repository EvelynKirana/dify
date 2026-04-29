'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { TanStackDevtoolsLoader } from '@/app/components/devtools/tanstack/loader'
import { getQueryClient } from './get-query-client'

export const TanstackQueryInitializer = ({ children }: { children: React.ReactNode }) => {
  const queryClient = getQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <TanStackDevtoolsLoader />
    </QueryClientProvider>
  )
}
