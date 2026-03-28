export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  images?: ImageAttachment[]
  timestamp: number
}

export interface ImageAttachment {
  data: string // base64
  mimeType: string
  name: string
}

export interface Preset {
  id: string
  name: string
  systemInstruction: string
  icon?: string
}

export interface Conversation {
  id: string
  presetId: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export type LLMProvider = 'gemini' | 'claude' | 'openai'

export interface AppSettings {
  apiKeys: {
    gemini: string
    claude: string
    openai: string
  }
  activeProvider: LLMProvider
  hotkey: string
  selectionHotkey: string
  windowMode: 'cursor' | 'pinned'
  pinnedPosition: { x: number; y: number }
  theme: 'light' | 'dark'
}

export interface IpcChannels {
  'get-cursor-position': () => { x: number; y: number }
  'get-selection': () => string
  'show-window': () => void
  'hide-window': () => void
}
