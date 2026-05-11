import { PUBLIC_API_PREFIX } from '@/config'

const absoluteUrlRegExp = /^[a-z][a-z\d+.-]*:\/\//i

function withLeadingSlash(path: string) {
  return path.startsWith('/') ? path : `/${path}`
}

function publicWebappOrigin() {
  try {
    return new URL(PUBLIC_API_PREFIX).origin
  }
  catch {
    return PUBLIC_API_PREFIX.replace(/\/api\/?$/, '').replace(/\/+$/, '')
  }
}

export function webappUrl(url?: string) {
  if (!url)
    return ''
  if (absoluteUrlRegExp.test(url))
    return url

  const origin = publicWebappOrigin()
  return `${origin}${withLeadingSlash(url)}`
}
