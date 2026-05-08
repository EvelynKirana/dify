'use client'

import { AccessChannelsSection } from './access-tab/channels-section'
import { DeveloperApiSection } from './access-tab/developer-api-section'
import { AccessPermissionsSection } from './access-tab/permissions-section'

export function AccessTab({ appInstanceId }: {
  appInstanceId: string
}) {
  return (
    <div className="flex w-full max-w-[960px] flex-col gap-5 p-6">
      <AccessPermissionsSection appInstanceId={appInstanceId} />
      <AccessChannelsSection appInstanceId={appInstanceId} />
      <DeveloperApiSection appInstanceId={appInstanceId} />
    </div>
  )
}
