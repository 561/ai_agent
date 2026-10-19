export interface ModelOption {
  value: string
  label: string
}

// Prices are paid-tier output per 1M tokens (Oct 2026)
export const GEMINI_MODELS: ModelOption[] = [
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite — cheapest ($0.40)' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite ($1.50)' },
  { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite ($2.50)' },
  { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash ($3.75)' },
  { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash — best for agent ($3.75)' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview ($12)' },
  { value: 'gemini-4-argon', label: 'Gemini 4 Argon — flagship, paid tier only ($10)' },
]

export const DEFAULT_CHAT_MODEL = 'gemini-2.5-flash-lite'
export const DEFAULT_AGENT_MODEL = 'gemini-3.8-flash'
// Cheap model used by the agent's web_search tool (Google Search grounding)
export const SEARCH_MODEL = 'gemini-3.1-flash-lite'

// Shut down by Google — saved settings/presets may still reference them
const RETIRED_MODELS: Record<string, string> = {
  'gemini-3.1-flash-lite-preview': 'gemini-3.1-flash-lite',
  'gemini-3-pro-preview': 'gemini-3.1-pro-preview',
  'gemini-2.0-flash': 'gemini-2.5-flash',
  'gemini-2.0-flash-lite': 'gemini-2.5-flash-lite',
}

export function resolveModel(model: string | undefined, fallback: string): string {
  if (!model) return fallback
  return RETIRED_MODELS[model] || model
}

// Gemini 3+ uses thinkingLevel; 2.5 uses thinkingBudget (lite has thinking off by default)
export function thinkingConfigFor(model: string, level: 'low' | 'high' = 'low'): Record<string, unknown> | undefined {
  if (/^gemini-(3|4)/.test(model)) return { thinkingLevel: level }
  if (/^gemini-2\.5-(flash|pro)$/.test(model)) return { thinkingBudget: level === 'low' ? 1024 : 8192 }
  return undefined
}
