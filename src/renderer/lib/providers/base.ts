import type { ChatMessage, ImageAttachment } from '../../../shared/types'

export interface LLMProviderInterface {
  name: string
  sendMessage(
    messages: ChatMessage[],
    systemInstruction: string,
    onChunk: (text: string) => void,
  ): Promise<string>
  isConfigured(): boolean
}

export function messagesToProviderFormat(messages: ChatMessage[]) {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
    images: msg.images,
  }))
}
