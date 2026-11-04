import { useState, useEffect, useCallback } from 'react'

const drafts = new Map<string, string>()

export function useDraft(key: string) {
  const [text, setText] = useState(() => drafts.get(key) ?? '')

  useEffect(() => {
    setText(drafts.get(key) ?? '')
  }, [key])

  const update = useCallback(
    (value: string | ((prev: string) => string)) => {
      setText((prev) => {
        const next = typeof value === 'function' ? value(prev) : value
        if (next) drafts.set(key, next)
        else drafts.delete(key)
        return next
      })
    },
    [key],
  )

  return [text, update] as const
}
