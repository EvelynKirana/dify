declare const __DIFYCTL_MIN_DIFY__: string
declare const __DIFYCTL_MAX_DIFY__: string

export type DifyCompat = {
  readonly minDify: string
  readonly maxDify: string
}

export const difyCompat: DifyCompat = {
  minDify: __DIFYCTL_MIN_DIFY__,
  maxDify: __DIFYCTL_MAX_DIFY__,
}

export function compatString(): string {
  return `dify >=${difyCompat.minDify}, <=${difyCompat.maxDify}`
}
