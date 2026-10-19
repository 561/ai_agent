import { useState, useEffect } from 'react'
import type { ChatMessage } from '../../shared/types'

const PAGE_SIZE = 10

// Renders only the latest messages; markdown + highlighting of a long history is the main memory cost
export function useVisibleMessages(messages: ChatMessage[], conversationId?: string) {
  const [limit, setLimit] = useState(PAGE_SIZE)

  useEffect(() => setLimit(PAGE_SIZE), [conversationId])

  const hiddenCount = Math.max(messages.length - limit, 0)
  return {
    visible: hiddenCount > 0 ? messages.slice(hiddenCount) : messages,
    hiddenCount,
    showMore: () => setLimit((l) => l + PAGE_SIZE),
  }
}
