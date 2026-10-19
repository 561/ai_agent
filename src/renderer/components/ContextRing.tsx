import React from 'react'
import { GEMINI_CONTEXT_LIMIT } from '../lib/models'
import { useI18n } from '../lib/i18n'

interface Props {
  tokens?: number
  // Matches the neighbouring buttons so the row lines up
  boxSize: number
}

const SIZE = 22
const STROKE = 3
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Share of the model's context window the latest request used; exact tokens on hover
export function ContextRing({ tokens = 0, boxSize }: Props) {
  const { t } = useI18n()
  const ratio = Math.min(tokens / GEMINI_CONTEXT_LIMIT, 1)
  const percent = ratio * 100
  const percentLabel = percent > 0 && percent < 10 ? percent.toFixed(1) : Math.round(percent).toString()
  // Keep a sliver visible once anything is used, otherwise small chats look empty
  const shown = tokens > 0 ? Math.max(ratio, 0.03) : 0
  const color = percent >= 80 ? '#ef4444' : percent >= 50 ? '#f59e0b' : '#3b82f6'

  return (
    <div className="relative group flex-shrink-0 flex items-center justify-center" style={{ width: boxSize, height: boxSize }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="rgba(148, 163, 184, 0.35)" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - shown)}
        />
      </svg>
      <div
        className="hidden group-hover:block absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md text-xs text-white bg-gray-900 shadow-lg z-10"
        style={{ padding: 'var(--padding-xs) var(--padding-sm)' }}
      >
        {t('context')}: {tokens.toLocaleString()} / {GEMINI_CONTEXT_LIMIT.toLocaleString()} {t('tokens')} ({percentLabel}%)
      </div>
    </div>
  )
}
