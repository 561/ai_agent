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

export function loadConversations(): Conversation[] {
  try {
    const stored = localStorage.getItem(CONVERSATIONS_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return []
}

export function saveConversations(conversations: Conversation[]) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations))
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
