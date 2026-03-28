import { GoogleGenerativeAI } from '@google/generative-ai'
import type { LLMProviderInterface } from './base'
import type { ChatMessage } from '../../../shared/types'

export class GeminiProvider implements LLMProviderInterface {
  name = 'Gemini'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0
  }

  async sendMessage(
    messages: ChatMessage[],
    systemInstruction: string,
    onChunk: (text: string) => void,
  ): Promise<string> {
    const genAI = new GoogleGenerativeAI(this.apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction || undefined,
    })

    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: this.buildParts(msg),
    }))

    const lastMessage = messages[messages.length - 1]
    const chat = model.startChat({ history })

    const result = await chat.sendMessageStream(this.buildParts(lastMessage))

    let fullText = ''
    for await (const chunk of result.stream) {
      const text = chunk.text()
      fullText += text
      onChunk(fullText)
    }

    return fullText
  }

  private buildParts(message: ChatMessage) {
    const parts: any[] = [{ text: message.content }]

    if (message.images?.length) {
      for (const img of message.images) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data,
          },
        })
      }
    }

    return parts
  }
}
