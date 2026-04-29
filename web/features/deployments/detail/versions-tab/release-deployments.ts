import type { DeployedToSummary, EnvironmentDeploymentRow, ReleaseHistoryRow } from '@/contract/console/deployments'
import {
  activeRelease,
  environmentId,
  environmentName,
  targetRelease,
} from '../../utils'

export type ReleaseDeploymentState = 'active' | 'deploying' | 'failed'

export type ReleaseDeployment = {
  environmentId: string
  environmentName: string
  state: ReleaseDeploymentState
}

function releaseDeploymentState(status?: string): ReleaseDeploymentState {
  const normalized = status?.toLowerCase() ?? ''
  if (normalized.includes('deploying') || normalized.includes('pending'))
    return 'deploying'
  if (normalized.includes('fail') || normalized.includes('error'))
    return 'failed'
  return 'active'
}

function fromDeployedTo(item: DeployedToSummary): ReleaseDeployment | undefined {
  if (!item.environmentId)
    return undefined

  return {
    environmentId: item.environmentId,
    environmentName: item.environmentName || item.environmentId,
    state: releaseDeploymentState(item.instanceStatus),
  }
}

function dedupeReleaseDeployments(items: ReleaseDeployment[]) {
  return items.filter((item, index) => {
    const key = `${item.environmentId}-${item.state}`
    return items.findIndex(candidate => `${candidate.environmentId}-${candidate.state}` === key) === index
  })
}

export function getReleaseDeployments(row: ReleaseHistoryRow, deploymentRows: EnvironmentDeploymentRow[]) {
  const releaseId = row.release?.id
  if (!releaseId)
    return []

  const historyItems = row.deployedTo?.map(fromDeployedTo).filter((item): item is ReleaseDeployment => !!item) ?? []
  const runtimeItems = deploymentRows.flatMap((deployment) => {
    const envId = environmentId(deployment.environment)
    if (!envId)
      return []

    const items: ReleaseDeployment[] = []
    if (activeRelease(deployment)?.id === releaseId) {
      items.push({
        environmentId: envId,
        environmentName: environmentName(deployment.environment),
        state: 'active',
      })
    }
    if (targetRelease(deployment)?.id === releaseId) {
      items.push({
        environmentId: envId,
        environmentName: environmentName(deployment.environment),
        state: 'deploying',
      })
    }
    if (deployment.instance?.lastError?.releaseId === releaseId) {
      items.push({
        environmentId: envId,
        environmentName: environmentName(deployment.environment),
        state: 'failed',
      })
    }
    return items
  })

  return dedupeReleaseDeployments([...historyItems, ...runtimeItems])
}
