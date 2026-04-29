import type { EnvironmentDeploymentRow, ReleaseHistoryRow } from '@/contract/console/deployments'
import { describe, expect, it } from 'vitest'
import { getReleaseDeployments } from '../release-deployments'

describe('getReleaseDeployments', () => {
  it('should prefer runtime deployment state when history has the same environment', () => {
    // Arrange
    const releaseRow = {
      id: 'release-1',
      deployedTo: [
        {
          environmentId: 'env-1',
          environmentName: 'Production',
          instanceStatus: 'failed',
        },
      ],
    } satisfies ReleaseHistoryRow
    const deploymentRows = [
      {
        id: 'deployment-1',
        environment: {
          id: 'env-1',
          name: 'Production',
        },
        status: 'ready',
        currentRelease: {
          id: 'release-1',
        },
      },
    ] satisfies EnvironmentDeploymentRow[]

    // Act
    const result = getReleaseDeployments(releaseRow, deploymentRows)

    // Assert
    expect(result).toEqual([
      {
        environmentId: 'env-1',
        environmentName: 'Production',
        state: 'active',
      },
    ])
  })

  it('should merge history deployments with runtime deployments for different environments', () => {
    // Arrange
    const releaseRow = {
      release: {
        id: 'release-1',
      },
      deployedTo: [
        {
          environmentId: 'env-1',
          environmentName: 'Production',
          instanceStatus: 'ready',
        },
      ],
    } satisfies ReleaseHistoryRow
    const deploymentRows = [
      {
        id: 'deployment-2',
        environment: {
          id: 'env-2',
          name: 'Staging',
        },
        status: 'deploying',
        currentRelease: {
          id: 'release-1',
        },
      },
    ] satisfies EnvironmentDeploymentRow[]

    // Act
    const result = getReleaseDeployments(releaseRow, deploymentRows)

    // Assert
    expect(result).toEqual([
      {
        environmentId: 'env-2',
        environmentName: 'Staging',
        state: 'deploying',
      },
      {
        environmentId: 'env-1',
        environmentName: 'Production',
        state: 'active',
      },
    ])
  })

  it('should return no deployments when the release row has no release id', () => {
    // Arrange
    const releaseRow = {
      deployedTo: [
        {
          environmentId: 'env-1',
          environmentName: 'Production',
          instanceStatus: 'ready',
        },
      ],
    } satisfies ReleaseHistoryRow

    // Act
    const result = getReleaseDeployments(releaseRow, [])

    // Assert
    expect(result).toEqual([])
  })
})
