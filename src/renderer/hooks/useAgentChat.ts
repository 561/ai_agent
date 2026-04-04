import { useState, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage, Conversation, AppSettings, Preset } from '../../shared/types'
import { runAgentLoop, type AgentAction } from '../lib/agent/agent-loop'
import { loadConversations, saveConversations } from '../lib/storage'

export function useAgentChat(settings: AppSettings, presets: Preset[]) {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isWaitingForUser, setIsWaitingForUser] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null)
  const abortRef = useRef({ aborted: false })
  const userResponseResolveRef = useRef<((answer: string) => void) | null>(null)

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null

  const persistConversations = useCallback((convs: Conversation[]) => {
    setConversations(convs)
    saveConversations(convs)
  }, [])

  const addMessage = useCallback((convId: string, msg: ChatMessage) => {
    setConversations((prev) => {
      const next = prev.map((c) =>
        c.id === convId
          ? { ...c, messages: [...c.messages, msg], updatedAt: Date.now() }
          : c,
      )
      saveConversations(next)
      return next
    })
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
      saveConversations(next)
      return next
    })
    setActiveConversationId(conv.id)
    return conv.id
  }, [])

  const sendToTelegram = useCallback(async (text: string) => {
    const { botToken, chatId } = settings.telegram || { botToken: '', chatId: '' }
    if (!botToken || !chatId) return
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
      })
    } catch (err) {
      console.error('[Agent] Failed to send Telegram notification:', err)
    }
  }, [settings.telegram])

  const sendTask = useCallback(
    async (content: string, conversationId?: string) => {
      const convId = conversationId || activeConversationId
      if (!convId) {
        console.error('[Agent] No conversation ID')
        return
      }

      const userMsg: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now(),
      }
      addMessage(convId, userMsg)

      const conv = conversations.find((c) => c.id === convId)
      const preset = presets.find((p) => p.id === conv?.presetId)
      const priorMessages = (conv?.messages || [])
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      setIsRunning(true)
      setStatusText('Starting agent...')
      abortRef.current = { aborted: false }

      try {
        await runAgentLoop(
          settings.apiKeys.gemini,
          preset?.llmModel || (preset?.type === 'agent' ? 'gemini-2.5-flash' : settings.geminiModel) || 'gemini-2.5-flash-lite',
          content,
          {
            onThinking: (text) => {
              setStatusText(text)
            },
            onAction: () => {
              // Actions are shown in the status bar via onThinking, not as chat messages
            },
            onDone: (summary) => {
              const doneMsg: ChatMessage = {
                id: uuidv4(),
                role: 'assistant',
                content: summary,
                timestamp: Date.now(),
              }
              addMessage(convId, doneMsg)
              setStatusText('')
              if (preset?.telegramNotify) {
                sendToTelegram(`*${preset.name}*\n\n${summary}`)
              }
            },
            onAskUser: (question) => {
              const questionMsg: ChatMessage = {
                id: uuidv4(),
                role: 'assistant',
                content: question,
                timestamp: Date.now(),
              }
              addMessage(convId, questionMsg)
              setIsWaitingForUser(true)
              setStatusText('Waiting for your response...')
              return new Promise<string>((resolve) => {
                userResponseResolveRef.current = resolve
              })
            },
            onError: (error) => {
              const errMsg: ChatMessage = {
                id: uuidv4(),
                role: 'assistant',
                content: `Error: ${error}`,
                timestamp: Date.now(),
              }
              addMessage(convId, errMsg)
              setStatusText('')
            },
            onScreenshot: (base64) => {
              setLastScreenshot(base64)
            },
          },
          abortRef.current,
          preset?.systemInstruction,
          priorMessages,
        )
      } catch (err: any) {
        const errMsg: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: `Error: ${err.message}`,
          timestamp: Date.now(),
        }
        addMessage(convId, errMsg)
      } finally {
        setIsRunning(false)
        setStatusText('')
      }
    },
    [activeConversationId, conversations, settings, presets, addMessage, sendToTelegram],
  )

  const respondToAgent = useCallback(
    (answer: string, conversationId?: string) => {
      const convId = conversationId || activeConversationId
      if (!convId) return

      const userMsg: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: answer,
        timestamp: Date.now(),
      }
      addMessage(convId, userMsg)

      setIsWaitingForUser(false)
      if (userResponseResolveRef.current) {
        userResponseResolveRef.current(answer)
        userResponseResolveRef.current = null
      }
    },
    [activeConversationId, addMessage],
  )

  const stopAgent = useCallback(() => {
    abortRef.current.aborted = true
    if (userResponseResolveRef.current) {
      userResponseResolveRef.current('[user stopped the agent]')
      userResponseResolveRef.current = null
      setIsWaitingForUser(false)
    }
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
    sendTask,
    respondToAgent,
    isRunning,
    isWaitingForUser,
    statusText,
    lastScreenshot,
    stopAgent,
    clearConversation,
  }
}
