import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@hey-api/openapi-ts'
import yaml from 'js-yaml'

type JsonObject = Record<string, unknown>

type OpenApiDocument = JsonObject & {
  paths?: Record<string, unknown>
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const enterpriseServerDir = process.env.DIFY_ENTERPRISE_SERVER
  ? path.resolve(process.env.DIFY_ENTERPRISE_SERVER)
  : path.resolve(currentDir, '../../dify-enterprise/server')
const enterpriseOpenApiPath = path.join(enterpriseServerDir, 'pkg/apis/enterprise/openapi.yaml')

const stripConsoleApiPrefix = (routePath: string) => {
  if (routePath.startsWith('/console/api/'))
    return routePath.replace('/console/api', '')

  return routePath
}

const stripSchemaNamePrefix = (schemaName: string) => {
  return schemaName
    .replace(/^dify\.enterprise\.api\.enterprise\./, '')
    .replace(/^pagination\./, '')
}

const normalizeEnterpriseOpenApi = () => {
  const openApi = yaml.load(fs.readFileSync(enterpriseOpenApiPath, 'utf8'))

  if (!openApi || typeof openApi !== 'object' || Array.isArray(openApi))
    throw new Error(`Invalid enterprise OpenAPI document: ${enterpriseOpenApiPath}`)

  const document = openApi as OpenApiDocument
  const paths = document.paths ?? {}

  document.paths = Object.fromEntries(
    Object.entries(paths).map(([routePath, pathItem]) => [stripConsoleApiPrefix(routePath), pathItem]),
  )

  return document
}

export default defineConfig({
  input: normalizeEnterpriseOpenApi(),
  output: {
    path: 'contract/generated/enterprise',
    fileName: {
      suffix: '.gen',
    },
    header: ctx => [
      '/* eslint-disable */',
      ...ctx.defaultValue,
    ],
  },
  parser: {
    transforms: {
      schemaName: stripSchemaNamePrefix,
    },
  },
  plugins: [
    {
      name: '@hey-api/typescript',
      comments: false,
    },
    'zod',
    {
      name: 'orpc',
      validator: 'zod',
    },
  ],
})
