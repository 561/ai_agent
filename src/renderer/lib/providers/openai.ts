import type { LLMProviderInterface } from './base'
import type { ChatMessage } from '../../../shared/types'

export class OpenAIProvider implements LLMProviderInterface {
  name = 'OpenAI'
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
    throw new Error('OpenAI provider not yet implemented')
  }
}
