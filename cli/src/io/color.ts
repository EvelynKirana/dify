import pc from 'picocolors'

export type ColorScheme = {
  bold: (s: string) => string
  successIcon: () => string
  warningIcon: () => string
  failureIcon: () => string
}

export function colorScheme(enabled: boolean): ColorScheme {
  if (!enabled) {
    return {
      bold: s => s,
      successIcon: () => '✓',
      warningIcon: () => '!',
      failureIcon: () => '✗',
    }
  }
  return {
    bold: s => pc.bold(s),
    successIcon: () => pc.green('✓'),
    warningIcon: () => pc.yellow('!'),
    failureIcon: () => pc.red('✗'),
  }
}

export function colorEnabled(isTTY: boolean): boolean {
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== '')
    return false
  if (process.env.DIFYCTL_NO_COLOR !== undefined && process.env.DIFYCTL_NO_COLOR !== '')
    return false
  return isTTY
}
