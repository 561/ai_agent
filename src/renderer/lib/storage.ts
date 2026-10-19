import type { AppSettings, Conversation, Preset } from '../../shared/types'

const SETTINGS_KEY = 'ai-agent-settings'
const CONVERSATIONS_KEY = 'ai-agent-conversations'
const PRESETS_KEY = 'ai-agent-presets'

const defaultSettings: AppSettings = {
  apiKeys: {
    gemini: '',
    claude: '',
    openai: '',
    groq: '',
  },
  activeProvider: 'gemini',
  geminiModel: 'gemini-2.5-flash-lite',
  hotkey: 'CommandOrControl+Shift+Space',
  windowMode: 'cursor',
  pinnedPosition: { x: 100, y: 100 },
  theme: 'dark',
  accentColor: '#2563eb',
  bgColor: '#1e293b',
  headerColor: '#0f172a',
  textColor: '#e2e8f0',
  fontSize: 'md',
  language: 'en',
  telegram: {
    botToken: '',
    chatId: '',
  },
}

function isAscii(s: string): boolean {
  return /^[\x20-\x7E]+$/.test(s)
}

export function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      const parsed = { ...defaultSettings, ...JSON.parse(stored) }
      // Reset non-ASCII hotkeys to defaults
      if (!isAscii(parsed.hotkey)) parsed.hotkey = defaultSettings.hotkey
      return parsed
    }
  } catch {}
  return { ...defaultSettings }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

// Chat and agent hooks each keep their own list — sharing one key made them overwrite each other
export const AGENT_CONVERSATIONS_KEY = 'ai-agent-agent-conversations'

// Older messages are dropped and old images stripped so a never-reset chat doesn't grow forever
const MAX_STORED_MESSAGES = 200
const KEEP_IMAGES_LAST = 10

function pruneConversation(conv: Conversation): Conversation {
  let messages = conv.messages.length > MAX_STORED_MESSAGES ? conv.messages.slice(-MAX_STORED_MESSAGES) : conv.messages
  const imageCutoff = messages.length - KEEP_IMAGES_LAST
  if (messages.some((m, i) => i < imageCutoff && m.images)) {
    messages = messages.map((m, i) => (i < imageCutoff && m.images ? { ...m, images: undefined } : m))
  }
  return messages === conv.messages ? conv : { ...conv, messages }
}

export function loadConversations(key = CONVERSATIONS_KEY): Conversation[] {
  try {
    const stored = localStorage.getItem(key)
    if (stored) return JSON.parse(stored)
  } catch {}
  return []
}

// One-time split of the old shared list
export function loadAgentConversations(agentPresetIds: Set<string>): Conversation[] {
  if (localStorage.getItem(AGENT_CONVERSATIONS_KEY) !== null) return loadConversations(AGENT_CONVERSATIONS_KEY)
  const migrated = loadConversations().filter((c) => agentPresetIds.has(c.presetId))
  localStorage.setItem(AGENT_CONVERSATIONS_KEY, JSON.stringify(migrated))
  return migrated
}

// Returns the pruned list — keep it in state so memory stays bounded too
export function saveConversations(conversations: Conversation[], key = CONVERSATIONS_KEY): Conversation[] {
  const pruned = conversations.map(pruneConversation)
  localStorage.setItem(key, JSON.stringify(pruned))
  return pruned
}

export function loadPresets(): Preset[] | null {
  try {
    const stored = localStorage.getItem(PRESETS_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return null
}

export function savePresets(presets: Preset[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
}
