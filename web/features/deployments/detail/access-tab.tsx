'use client'

import { AccessChannelsSection } from './access-tab/channels-section'
import { DeveloperApiSection } from './access-tab/developer-api-section'
import { AccessPermissionsSection } from './access-tab/permissions-section'

export function AccessTab({ instanceId: appId }: {
  instanceId: string
}) {
  return (
    <div className="flex w-full max-w-[960px] flex-col gap-5 p-6">
      <AccessPermissionsSection appId={appId} />
      <AccessChannelsSection appId={appId} />
      <DeveloperApiSection appId={appId} />
    </div>
  )
}
