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
  llmProvider?: LLMProvider
  llmModel?: string
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
    groq: string
  }
  activeProvider: LLMProvider
  geminiModel: string
  hotkey: string
  windowMode: 'cursor' | 'pinned'
  pinnedPosition: { x: number; y: number }
  theme: 'light' | 'dark'
  accentColor: string
  bgColor: string
  headerColor: string
  textColor: string
  fontSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export interface IpcChannels {
  'get-cursor-position': () => { x: number; y: number }
  'get-selection': () => string
  'show-window': () => void
  'hide-window': () => void
}
