import type { LLMProviderInterface } from './base'
import type { ChatMessage } from '../../../shared/types'

export class ClaudeProvider implements LLMProviderInterface {
  name = 'Claude'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0
  }

  async sendMessage(
    _messages: ChatMessage[],
    _systemInstruction: string,
    _onChunk: (text: string) => void,
  ): Promise<string> {
    throw new Error('Claude provider not yet implemented')
  }
}
