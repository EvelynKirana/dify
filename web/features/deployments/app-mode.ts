import { AppModeEnum } from '@/types/app'

const appModeValues = new Set<string>(Object.values(AppModeEnum))

export function toAppMode(mode?: string): AppModeEnum {
  return appModeValues.has(mode ?? '') ? (mode as AppModeEnum) : AppModeEnum.WORKFLOW
}
