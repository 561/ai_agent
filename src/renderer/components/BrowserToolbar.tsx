import React from 'react'
import type { AgentState } from '../../shared/types'

interface Props {
  agentState: AgentState
  urlInput: string
  onUrlChange: (url: string) => void
  onNavigate: (url: string) => void
  onBack: () => void
  onForward: () => void
  onRefresh: () => void
}

export function BrowserToolbar({ agentState, urlInput, onUrlChange, onNavigate, onBack, onForward, onRefresh }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      let url = urlInput.trim()
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }
      if (url) onNavigate(url)
    }
  }

  return (
    <div
      className="flex items-center border-b border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 flex-shrink-0"
      style={{ padding: 'var(--padding-xs) var(--padding-sm)', gap: 'var(--padding-xs)' }}
    >
      <button
        onClick={onBack}
        disabled={!agentState.canGoBack}
        className="rounded p-0.5 text-gray-500 hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Back"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        onClick={onForward}
        disabled={!agentState.canGoForward}
        className="rounded p-0.5 text-gray-500 hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Forward"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
      <button
        onClick={onRefresh}
        className="rounded p-0.5 text-gray-500 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
        title="Refresh"
      >
        {agentState.isLoading ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        )}
      </button>

      <input
        type="text"
        value={urlInput}
        onChange={(e) => onUrlChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 text-xs bg-surface-50 dark:bg-surface-900 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 dark:text-white"
        placeholder="Enter URL..."
      />

      {agentState.isLoading && (
        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}
    </div>
  )
}
