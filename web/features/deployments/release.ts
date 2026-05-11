import type { ConsoleRelease, ReleaseRow } from '@dify/contracts/enterprise/types.gen'

export function formatDate(value?: string) {
  if (!value)
    return '—'
  return value.replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '').slice(0, 16)
}

export function releaseLabel(release?: ConsoleRelease | ReleaseRow) {
  return release?.name || release?.id || '—'
}

export function releaseCommit(release?: ConsoleRelease | ReleaseRow) {
  return release && 'shortCommitId' in release ? release.shortCommitId || '—' : '—'
}
