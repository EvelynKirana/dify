'use client'

import { useEffect, useRef, useState } from 'react'

export function useCopyFeedback(resetDelay = 1500) {
  const [copied, setCopied] = useState(false)
  const resetTimerRef = useRef<number | undefined>(undefined)

  function showCopied() {
    if (resetTimerRef.current !== undefined)
      window.clearTimeout(resetTimerRef.current)

    setCopied(true)
    resetTimerRef.current = window.setTimeout(() => {
      setCopied(false)
      resetTimerRef.current = undefined
    }, resetDelay)
  }

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== undefined)
        window.clearTimeout(resetTimerRef.current)
    }
  }, [])

  return {
    copied,
    showCopied,
  }
}
