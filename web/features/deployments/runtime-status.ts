import type { RuntimeInstanceRow } from '@dify/contracts/enterprise/types.gen'

type DeploymentUiStatus = 'ready' | 'deploying' | 'deploy_failed'

export function isUndeployedDeploymentRow(row?: RuntimeInstanceRow) {
  return (row?.status?.toLowerCase() ?? '').includes('undeployed') || (!row?.id && !row?.currentRelease && !row?.detail)
}

export function deploymentStatus(row: RuntimeInstanceRow): DeploymentUiStatus {
  const runtimeStatus = row.status?.toLowerCase() ?? ''
  if (runtimeStatus.includes('deploying') || runtimeStatus.includes('pending'))
    return 'deploying'
  if (runtimeStatus.includes('fail') || runtimeStatus.includes('error'))
    return 'deploy_failed'
  return 'ready'
}
