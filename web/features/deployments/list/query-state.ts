import { parseAsString } from 'nuqs'

export const envFilterQueryState = parseAsString.withDefault('all').withOptions({ history: 'push' })
export const keywordsQueryState = parseAsString.withDefault('').withOptions({ history: 'push' })
