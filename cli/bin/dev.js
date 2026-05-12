#!/usr/bin/env -S node --import tsx

import { execute } from '@oclif/core'

globalThis.__DIFYCTL_VERSION__ = process.env.DIFYCTL_VERSION ?? '0.0.0-dev'
globalThis.__DIFYCTL_COMMIT__ = process.env.DIFYCTL_COMMIT ?? 'HEAD'
globalThis.__DIFYCTL_BUILD_DATE__ = process.env.DIFYCTL_BUILD_DATE ?? new Date().toISOString()
globalThis.__DIFYCTL_CHANNEL__ = process.env.DIFYCTL_CHANNEL ?? 'dev'
globalThis.__DIFYCTL_MIN_DIFY__ = process.env.DIFYCTL_MIN_DIFY ?? '0.0.0'
globalThis.__DIFYCTL_MAX_DIFY__ = process.env.DIFYCTL_MAX_DIFY ?? '0.0.0'

await execute({ development: true, dir: import.meta.url })
