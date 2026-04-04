import React from 'react'
import { CompactChat } from './CompactChat'
import type { Conversation, Preset } from '../../shared/types'
import { useI18n } from '../lib/i18n'

interface Props {
  conversation: Conversation | null
  isRunning: boolean
  isWaitingForUser: boolean
  statusText: string
  onSendTask: (content: string) => void
  onRespondToAgent: (answer: string) => void
  onStop: () => void
  focusSignal?: number
  preset: Preset
}

export function AgentView({ conversation, isRunning, isWaitingForUser, statusText, onSendTask, onRespondToAgent, onStop, focusSignal }: Props) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col h-full min-h-0" style={{ backgroundColor: '#1a1a2e' }}>
      {/* Status bar */}
      {isRunning && statusText && !isWaitingForUser && (
        <div className="flex-shrink-0 px-2 py-1 bg-blue-500/10 border-b border-blue-500/20 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
          <span className="text-xs text-blue-400 truncate">{statusText}</span>
        </div>
      )}

      {/* Waiting for user action banner */}
      {isWaitingForUser && (
        <div className="flex-shrink-0 px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-400 flex-1">{t('agentWaitingForUser')}</span>
          <button
            onClick={() => onRespondToAgent('done')}
            className="px-3 py-1 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors flex-shrink-0"
          >
            {t('agentContinue')}
          </button>
        </div>
      )}

      {/* Chat — fills all space */}
      <div className="flex-1 min-h-0">
        <CompactChat
          conversation={conversation}
          isStreaming={isRunning && !isWaitingForUser}
          streamingText=""
          onSend={(content) => isWaitingForUser ? onRespondToAgent(content) : onSendTask(content)}
          onStop={onStop}
          focusSignal={focusSignal}
        />
      </div>
    </div>
  )
}
