/* eslint-disable react/component-hook-factories -- Mirrors foxact's storage hook factory shape. */
import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useLayoutEffect as useLayoutEffectFromReact, useMemo, useSyncExternalStore } from 'react'
import { noop } from '../noop'
import 'client-only'

/*
 * Adapted from foxact/create-storage-hook.
 *
 * MIT License
 * Copyright (c) 2023 Sukka
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

export type StorageType = 'localStorage' | 'sessionStorage'
export type NotUndefined<T> = T extends undefined ? never : T
export type StateHookTuple<T> = readonly [T, Dispatch<SetStateAction<T | null>>]
export type StateHookTupleNullable<T> = readonly [T | null, Dispatch<SetStateAction<T | null>>]
export type Serializer<T> = (value: T) => string
export type Deserializer<T> = (value: string) => T
export type CustomStorageEvent = CustomEvent<string>
export type UseStorageRawOption = {
  raw: true
}
export type UseStorageParserOption<T> = {
  raw?: false
  serializer: Serializer<T>
  deserializer: Deserializer<T>
}

declare global {
  // eslint-disable-next-line ts/consistent-type-definitions -- WindowEventMap uses interface merging.
  interface WindowEventMap {
    'foxact-use-local-storage': CustomStorageEvent
    'foxact-use-session-storage': CustomStorageEvent
  }
}

const defaultStorageOption = {
  raw: false,
  serializer: JSON.stringify,
  deserializer: JSON.parse,
} satisfies UseStorageParserOption<unknown>
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffectFromReact

function isFunction<T>(value: SetStateAction<T | null>): value is (prevState: T | null) => T | null {
  return typeof value === 'function'
}

function identity<T>(value: T) {
  return value
}

function stringIdentity<T>(value: string) {
  return value as T
}

function getOption<T>(
  option: UseStorageRawOption | UseStorageParserOption<T> = defaultStorageOption as UseStorageParserOption<T>,
) {
  return {
    serializer: option.raw ? identity<T> : option.serializer,
    deserializer: option.raw ? stringIdentity<T> : option.deserializer,
  }
}

export function createStorage(type: StorageType) {
  const storageEventKey = type === 'localStorage' ? 'foxact-use-local-storage' : 'foxact-use-session-storage'
  const hookName = type === 'localStorage' ? 'useLocalStorage' : 'useSessionStorage'

  function getServerSnapshotWithoutServerValue(): never {
    throw new Error(`[${hookName}] cannot be used on the server without a serverValue`)
  }

  function dispatchStorageEvent(key: string) {
    window.dispatchEvent(new CustomEvent(storageEventKey, { detail: key }))
  }

  function setStorageItem(key: string, value: string) {
    try {
      window[type].setItem(key, value)
    }
    catch {
      console.warn(`[${hookName}] Failed to set value to ${type}, it might be blocked`)
    }
    finally {
      dispatchStorageEvent(key)
    }
  }

  function removeStorageItem(key: string) {
    try {
      window[type].removeItem(key)
    }
    catch {
      console.warn(`[${hookName}] Failed to remove value from ${type}, it might be blocked`)
    }
    finally {
      dispatchStorageEvent(key)
    }
  }

  function getStorageItem(key: string) {
    if (typeof window === 'undefined')
      return null

    try {
      return window[type].getItem(key)
    }
    catch {
      console.warn(`[${hookName}] Failed to get value from ${type}, it might be blocked`)
      return null
    }
  }

  function useSetStorage<T>(
    key: string,
    option?: UseStorageRawOption | UseStorageParserOption<T>,
  ) {
    const { serializer, deserializer } = getOption(option)

    return useCallback((value: SetStateAction<T | null>) => {
      try {
        let nextState: T | null
        if (isFunction(value)) {
          const currentRaw = getStorageItem(key)
          const currentState = currentRaw === null ? null : deserializer(currentRaw)
          nextState = value(currentState)
        }
        else {
          nextState = value
        }

        if (nextState === null)
          removeStorageItem(key)
        else
          setStorageItem(key, serializer(nextState) as string)
      }
      catch (error) {
        console.warn(error)
      }
    }, [deserializer, key, serializer])
  }

  function useStorageValue<T>(
    key: string,
    serverValue: NotUndefined<T>,
    option?: UseStorageRawOption | UseStorageParserOption<T>,
  ): T
  function useStorageValue<T = string>(
    key: string,
    serverValue?: undefined,
    option?: UseStorageRawOption | UseStorageParserOption<T>,
  ): T | null
  function useStorageValue<T>(
    key: string,
    serverValue?: NotUndefined<T>,
    option?: UseStorageRawOption | UseStorageParserOption<T>,
  ) {
    const subscribeToKey = useCallback((callback: () => void) => {
      if (typeof window === 'undefined')
        return noop

      const handleStorageEvent = (event: StorageEvent) => {
        if (!('key' in event) || event.key === key)
          callback()
      }
      const handleCustomStorageEvent = (event: CustomStorageEvent) => {
        if (event.detail === key)
          callback()
      }

      window.addEventListener('storage', handleStorageEvent)
      window.addEventListener(storageEventKey, handleCustomStorageEvent)
      return () => {
        window.removeEventListener('storage', handleStorageEvent)
        window.removeEventListener(storageEventKey, handleCustomStorageEvent)
      }
    }, [key])

    const { serializer, deserializer } = getOption(option)
    const getClientSnapshot = () => getStorageItem(key)
    const getServerSnapshot = serverValue === undefined
      ? getServerSnapshotWithoutServerValue
      : () => serializer(serverValue) as string

    const store = useSyncExternalStore(
      subscribeToKey,
      getClientSnapshot,
      getServerSnapshot,
    )
    const deserialized = useMemo(() => (store === null ? null : deserializer(store)), [deserializer, store])

    useIsomorphicLayoutEffect(() => {
      if (getStorageItem(key) === null && serverValue !== undefined)
        setStorageItem(key, serializer(serverValue) as string)
    }, [key, serializer, serverValue])

    return deserialized === null
      ? serverValue === undefined
        ? null
        : serverValue
      : deserialized
  }

  function useStorage<T>(
    key: string,
    serverValue: NotUndefined<T>,
    option?: UseStorageRawOption | UseStorageParserOption<T>,
  ): StateHookTuple<T>
  function useStorage<T = string>(
    key: string,
    serverValue?: undefined,
    option?: UseStorageRawOption | UseStorageParserOption<T>,
  ): StateHookTupleNullable<T>
  function useStorage<T>(
    key: string,
    serverValue?: NotUndefined<T>,
    option?: UseStorageRawOption | UseStorageParserOption<T>,
  ): StateHookTuple<T> | StateHookTupleNullable<T> {
    const value = useStorageValue<T>(key, serverValue as NotUndefined<T>, option)
    const setValue = useSetStorage<T>(key, option)

    return [value, setValue] as const
  }

  return {
    useStorage,
    useSetStorage,
    useStorageValue,
  }
}
