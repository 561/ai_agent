import { useState, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage, ImageAttachment, Conversation, AppSettings, LLMProvider, Preset } from '../../shared/types'
import { GeminiProvider } from '../lib/providers/gemini'
import { ClaudeProvider } from '../lib/providers/claude'
import { OpenAIProvider } from '../lib/providers/openai'
import type { LLMProviderInterface } from '../lib/providers/base'
import { loadConversations, saveConversations } from '../lib/storage'
import { DEFAULT_CHAT_MODEL, resolveModel } from '../lib/models'

function getProvider(settings: AppSettings, provider?: LLMProvider, model?: string): LLMProviderInterface {
  const activeProvider = provider || settings.activeProvider

  switch (activeProvider) {
    case 'gemini':
      return new GeminiProvider(settings.apiKeys.gemini, resolveModel(model || settings.geminiModel, DEFAULT_CHAT_MODEL))
    case 'claude':
      return new ClaudeProvider(settings.apiKeys.claude)
    case 'openai':
      return new OpenAIProvider(settings.apiKeys.openai)
    default:
      return new GeminiProvider(settings.apiKeys.gemini, resolveModel(model || settings.geminiModel, DEFAULT_CHAT_MODEL))
  }
}

// Only the latest messages are sent to the model — keeps a never-reset chat fast and cheap
const CONTEXT_MESSAGES = 20

function contextWindow(messages: ChatMessage[]): ChatMessage[] {
  const recent = messages.slice(-CONTEXT_MESSAGES)
  // Gemini history must start with a user turn
  const firstUser = recent.findIndex((m) => m.role === 'user')
  return firstUser > 0 ? recent.slice(firstUser) : recent
}

export function useChat(settings: AppSettings, presets?: Preset[]) {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const agentPresetIds = new Set((presets || []).filter((p) => p.type === 'agent').map((p) => p.id))
    return loadConversations().filter((c) => !agentPresetIds.has(c.presetId))
  })
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const abortRef = useRef(false)

  const getPresetForConversation = (convId: string): Preset | undefined => {
    if (!presets) return undefined
    const conv = conversations.find((c) => c.id === convId)
    if (!conv) return undefined
    return presets.find((p) => p.id === conv.presetId)
  }

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null

  const persistConversations = useCallback((convs: Conversation[]) => {
    setConversations(saveConversations(convs))
  }, [])

  const startConversation = useCallback((presetId: string) => {
    const conv: Conversation = {
      id: uuidv4(),
      presetId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setConversations((prev) => {
      const next = [conv, ...prev]
      return saveConversations(next)
    })
    setActiveConversationId(conv.id)
    return conv.id
  }, [])

  const sendMessage = useCallback(
    async (
      content: string,
      images: ImageAttachment[],
      systemInstruction: string,
      conversationId?: string,
    ) => {
      const convId = conversationId || activeConversationId
      if (!convId) return

      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content,
        images: images.length > 0 ? images : undefined,
        timestamp: Date.now(),
      }

      // Add user message
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === convId
            ? { ...c, messages: [...c.messages, userMessage], updatedAt: Date.now() }
            : c,
        )
        return saveConversations(next)
      })

      // Stream assistant response
      setIsStreaming(true)
      setStreamingText('')
      abortRef.current = false

      try {
        const preset = getPresetForConversation(convId)
        const provider = getProvider(settings, preset?.llmProvider, preset?.llmModel)
        const conv = conversations.find((c) => c.id === convId)
        const allMessages = contextWindow([...(conv?.messages || []), userMessage])

        const fullText = await provider.sendMessage(
          allMessages,
          systemInstruction,
          (text) => {
            if (!abortRef.current) {
              setStreamingText(text)
            }
          },
        )

        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: fullText,
          timestamp: Date.now(),
        }

        setConversations((prev) => {
          const next = prev.map((c) =>
            c.id === convId
              ? { ...c, messages: [...c.messages, userMessage, assistantMessage].filter(
                  (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i,
                ), updatedAt: Date.now() }
              : c,
          )
          return saveConversations(next)
        })
      } catch (error: any) {
        const errorMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: `Error: ${error.message || 'Failed to get response'}`,
          timestamp: Date.now(),
        }

        setConversations((prev) => {
          const next = prev.map((c) =>
            c.id === convId
              ? { ...c, messages: [...c.messages, errorMessage], updatedAt: Date.now() }
              : c,
          )
          return saveConversations(next)
        })
      } finally {
        setIsStreaming(false)
        setStreamingText('')
      }
    },
    [activeConversationId, conversations, settings, presets],
  )

  const stopStreaming = useCallback(() => {
    abortRef.current = true
  }, [])

  const clearConversation = useCallback(
    (convId: string) => {
      persistConversations(conversations.filter((c) => c.id !== convId))
      if (activeConversationId === convId) {
        setActiveConversationId(null)
      }
    },
    [conversations, activeConversationId, persistConversations],
  )

  return {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    startConversation,
    sendMessage,
    isStreaming,
    streamingText,
    stopStreaming,
    clearConversation,
  }
}
