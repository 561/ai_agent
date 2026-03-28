import type { AppSettings, Conversation, Preset } from '../../shared/types'

const SETTINGS_KEY = 'ai-agent-settings'
const CONVERSATIONS_KEY = 'ai-agent-conversations'
const PRESETS_KEY = 'ai-agent-presets'

const defaultSettings: AppSettings = {
  apiKeys: {
    gemini: '',
    claude: '',
    openai: '',
  },
  activeProvider: 'gemini',
  hotkey: 'CommandOrControl+Shift+Space',
  selectionHotkey: 'CommandOrControl+Shift+V',
  windowMode: 'cursor',
  pinnedPosition: { x: 100, y: 100 },
  theme: 'dark',
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
      if (!isAscii(parsed.selectionHotkey)) parsed.selectionHotkey = defaultSettings.selectionHotkey
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
