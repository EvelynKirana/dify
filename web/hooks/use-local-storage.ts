import type {
  Deserializer,
  Serializer,
  UseStorageParserOption,
  UseStorageRawOption,
} from './create-storage-hook'
import { createStorage } from './create-storage-hook'
import 'client-only'

export type UseLocalStorageRawOption = UseStorageRawOption
export type UseLocalStorageParserOption<T> = UseStorageParserOption<T>
export type UseLocalStorageSerializer<T> = Serializer<T>
export type UseLocalStorageDeserializer<T> = Deserializer<T>

const {
  useStorage: useLocalStorage,
  useSetStorage: useSetLocalStorage,
  useStorageValue: useLocalStorageValue,
} = createStorage('localStorage')

/** @see https://foxact.skk.moe/use-local-storage */
export {
  useLocalStorage,
  useLocalStorageValue,
  useSetLocalStorage,
}
