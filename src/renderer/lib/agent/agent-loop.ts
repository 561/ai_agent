import { GoogleGenerativeAI, type FunctionDeclaration, SchemaType, type Part, type Content, type GenerativeModel } from '@google/generative-ai'
import {
  type InteractiveElement,
  getPageState,
  getPageText,
  readUrl,
  clickElement,
  typeText,
  pressKey,
  scrollPage,
  navigateTo,
  formatElementsForLLM,
  launchBrowser,
} from './browser-actions'
import { SEARCH_MODEL, thinkingConfigFor } from '../models'
import type { ImageAttachment } from '../../../shared/types'

export interface AgentAction {
  tool: string
  args: Record<string, any>
  result: string
}

export interface AgentStepCallback {
  onThinking: (text: string) => void
  onAction: (action: AgentAction) => void
  onAskUser: (question: string) => Promise<string>
  onScreenshot: (base64: string) => void
  // Tokens the latest request occupied (prompt + response)
  onUsage: (tokens: number) => void
  onDone: (summary: string) => void
  onError: (error: string) => void
}

const TOOLS: FunctionDeclaration[] = [
  {
    name: 'web_search',
    description: 'Search the web (Google) and get a short factual answer with source URLs. Fast and cheap — the best first step for any question that needs information from the internet. Does not touch the visible browser.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: 'Specific search query. Include names, versions, dates, location when relevant.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_url',
    description: 'Read the main text of any URL in a background tab (no screenshot). Use it to verify facts in a source from web_search or to read an article. Long pages are paged — pass offset to continue.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        url: { type: SchemaType.STRING, description: 'The URL to read' },
        offset: { type: SchemaType.INTEGER, description: 'Character offset for long pages (default 0)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'click',
    description: 'Click on an interactive element by its index number from the elements list',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        index: { type: SchemaType.INTEGER, description: 'The index number of the element to click' },
      },
      required: ['index'],
    },
  },
  {
    name: 'type_text',
    description: 'Type text into an input/textarea element by its index number. This replaces existing text.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        index: { type: SchemaType.INTEGER, description: 'The index number of the input element' },
        text: { type: SchemaType.STRING, description: 'The text to type' },
      },
      required: ['index', 'text'],
    },
  },
  {
    name: 'press_key',
    description: 'Press a keyboard key (Enter, Escape, Tab, etc.) on the currently focused element',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        key: { type: SchemaType.STRING, description: 'The key to press, e.g. "Enter", "Escape", "Tab"' },
      },
      required: ['key'],
    },
  },
  {
    name: 'scroll',
    description: 'Scroll the page up or down to see more content',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        direction: { type: SchemaType.STRING, description: '"up" or "down"' },
      },
      required: ['direction'],
    },
  },
  {
    name: 'navigate',
    description: 'Navigate the visible browser to a URL (use when you need to interact with the site)',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        url: { type: SchemaType.STRING, description: 'The URL to navigate to' },
      },
      required: ['url'],
    },
  },
  {
    name: 'get_text',
    description: 'Get the main text of the current page in the visible browser. Long pages are paged — pass offset to continue.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        offset: { type: SchemaType.INTEGER, description: 'Character offset for long pages (default 0)' },
      },
    },
  },
  {
    name: 'save_note',
    description: 'Save a key fact you found (name, price, number, date, link). Old page text is dropped from your memory to save space, so save anything you will need for the final answer.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        note: { type: SchemaType.STRING, description: 'Short fact with its source URL' },
      },
      required: ['note'],
    },
  },
  {
    name: 'wait',
    description: 'Wait for the page to load or update (e.g., after clicking a link or submitting a form)',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        seconds: { type: SchemaType.INTEGER, description: 'How many seconds to wait (1-5)' },
      },
      required: ['seconds'],
    },
  },
  {
    name: 'ask_user',
    description: 'Ask the user a question and wait for their response. Use when you need help: CAPTCHA, login required, ambiguous choice, confirmation, or any situation where you cannot proceed without human input.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        question: { type: SchemaType.STRING, description: 'The question to ask the user. Be specific about what you need them to do.' },
      },
      required: ['question'],
    },
  },
  {
    name: 'done',
    description: 'Call this when the task is complete. Provide the final answer for the user.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        summary: { type: SchemaType.STRING, description: 'Final answer: concrete results with source links' },
      },
      required: ['summary'],
    },
  },
]

// Tools that never change the visible page — no need to send a fresh screenshot after them
const NO_PAGE_CHANGE = new Set(['web_search', 'read_url', 'get_text', 'save_note'])

const MAX_STEPS = 40
// Tool results older than this many tool turns get truncated in history
const KEEP_FULL_TOOL_TURNS = 2
const OLD_RESULT_CHARS = 600
const HISTORY_MESSAGES = 20
const HISTORY_MESSAGE_CHARS = 6000
// Images from earlier user messages that are re-attached to the history
const HISTORY_IMAGES = 4

function buildSystemInstruction(): string {
  const today = new Date().toISOString().slice(0, 10)
  return `You are a capable web agent. Today is ${today}. You have web search, a page reader and a real browser you control via tools.

CRITICAL: ALWAYS respond with a tool call. Never reply with plain text. When finished, call "done".

## Pick the cheapest tool that works
- Information questions (facts, news, prices, docs, comparisons, "what/who/when/how"): use "web_search" first. Then "read_url" on 1–3 of the best sources to verify details. Do NOT open the visible browser for this.
- Interactive tasks (log in, fill a form, order, book, click through a site): use "navigate" + "click"/"type_text" in the visible browser.
- Known site → navigate to it directly (amazon.com, youtube.com, grab.com, …). Never search Google for a site's address.

## Searching well
- Write specific queries: names, versions, location, year. For recent things add the current year.
- If results are thin or off-topic, rephrase (synonyms, English query, narrower terms) instead of repeating the same query.
- Prefer primary sources (official sites, docs, vendor pages) over aggregators. Cross-check numbers in two sources when it matters.
- Stop as soon as you have a reliable answer — do not keep browsing "just in case".

## Browser rules
- Only use element indices from the LATEST elements list — indices change after every page update.
- If a click fails, look at the new screenshot/elements before retrying. If an approach fails twice, switch approach.
- Use "get_text" to read the current page; scroll if needed elements are off-screen.

## Memory
Older screenshots and long tool outputs are removed from your context to save space. Use "save_note" for facts you will need later.

## Final answer ("done")
- Answer in the user's language.
- Give the OUTCOME: concrete names, numbers, prices, dates, and source links. No list of your actions.
- If something could not be confirmed, say so briefly.

## Ask the user (ask_user) when
CAPTCHA, login required, payment/irreversible confirmation, or a genuinely ambiguous choice.`
}

async function webSearch(genAI: GoogleGenerativeAI, query: string): Promise<string> {
  const searchModel = genAI.getGenerativeModel({
    model: SEARCH_MODEL,
    // googleSearch isn't in this SDK's types but is passed through to the API as-is
    tools: [{ googleSearch: {} } as any],
  })
  const result = await searchModel.generateContent(
    `Search the web and answer the query concisely with concrete facts (names, numbers, prices, dates). ` +
    `Mention which source each key fact came from. Query: ${query}`,
  )
  const candidate = result.response.candidates?.[0]
  const text = candidate?.content?.parts?.map((p) => p.text || '').join('').trim() || 'No answer.'
  const sources = (candidate?.groundingMetadata?.groundingChunks || [])
    .map((c: any) => c.web)
    .filter((w: any) => w?.uri)
    .slice(0, 6)
    .map((w: any, i: number) => `${i + 1}. ${w.title || 'source'} — ${w.uri}`)
  return sources.length > 0 ? `${text.substring(0, 3000)}\n\nSources:\n${sources.join('\n')}` : text.substring(0, 3000)
}

// Screenshot parts are tracked by identity so images the user attached are never dropped
const screenshotParts = new WeakSet<Part>()

// Drops screenshots/element lists from all but the latest page state and shortens old tool outputs
function compactHistory(history: Content[], pageStateIdx: number[], toolResultIdx: number[]) {
  for (const i of pageStateIdx.slice(0, -1)) {
    history[i].parts = history[i].parts.flatMap((p): Part[] => {
      if (screenshotParts.has(p)) return []
      if (p.text?.includes('\n\nInteractive elements')) {
        return [{ text: `${p.text.split('\n\nInteractive elements')[0]}\n[old page state removed]` }]
      }
      return [p]
    })
  }
  for (const i of toolResultIdx.slice(0, -KEEP_FULL_TOOL_TURNS)) {
    for (const part of history[i].parts) {
      const response = part.functionResponse?.response as { result?: string } | undefined
      if (response?.result && response.result.length > OLD_RESULT_CHARS) {
        response.result = response.result.substring(0, OLD_RESULT_CHARS) + '… [truncated — use save_note for facts you need]'
      }
    }
  }
}

function pageStateParts(prefix: string, state: { url: string; title: string; screenshot: string; elements: InteractiveElement[] }): Part[] {
  const screenshot: Part = { inlineData: { mimeType: 'image/jpeg', data: state.screenshot } }
  screenshotParts.add(screenshot)
  return [
    { text: `${prefix}\nURL: ${state.url}\nTitle: ${state.title}\n\nInteractive elements:\n${formatElementsForLLM(state.elements)}` },
    screenshot,
  ]
}

export async function runAgentLoop(
  apiKey: string,
  model: string,
  task: string,
  callbacks: AgentStepCallback,
  abortSignal: { aborted: boolean },
  presetSystemInstruction?: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string; images?: ImageAttachment[] }>,
  images: ImageAttachment[] = [],
): Promise<void> {
  const genAI = new GoogleGenerativeAI(apiKey)

  let systemInstruction = buildSystemInstruction()
  if (presetSystemInstruction) {
    systemInstruction += '\n\nAdditional context:\n' + presetSystemInstruction
  }

  const makeModel = (withConfig: boolean): GenerativeModel => genAI.getGenerativeModel({
    model,
    systemInstruction,
    tools: [{ functionDeclarations: TOOLS }],
    generationConfig: withConfig
      ? {
          thinkingConfig: thinkingConfigFor(model, 'low'),
          // Medium resolution is enough to read screenshots and costs ~half the tokens
          mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
        } as any
      : undefined,
  })
  let geminiModel = makeModel(true)
  let configFallbackUsed = false

  const generate = async (contents: Content[]) => {
    try {
      return await geminiModel.generateContent({ contents })
    } catch (err: any) {
      // Some models reject thinking/media options — retry once without them
      if (!configFallbackUsed && /400|thinking|mediaResolution|Invalid/i.test(err.message || '')) {
        configFallbackUsed = true
        geminiModel = makeModel(false)
        return geminiModel.generateContent({ contents })
      }
      throw err
    }
  }

  let currentElements: InteractiveElement[] = []

  callbacks.onThinking('Launching browser...')

  try {
    await launchBrowser()
  } catch (err: any) {
    callbacks.onError('Failed to launch browser: ' + err.message)
    return
  }

  let pageState
  try {
    pageState = await getPageState()
  } catch (err: any) {
    callbacks.onError('Failed to capture page state: ' + err.message)
    return
  }
  currentElements = pageState.elements
  callbacks.onScreenshot(pageState.screenshot)

  // Manually managed history so old screenshots and tool output can be compacted.
  // Tool results go in a 'user' turn (current Gemini models reject role 'function'),
  // together with the fresh page state to keep user/model turns alternating.
  const history: Content[] = []
  const pageStateIdx: number[] = []
  const toolResultIdx: number[] = []

  const recent = (conversationHistory || []).slice(-HISTORY_MESSAGES)
  if (recent.length > 0) {
    const oldImages: Part[] = recent
      .flatMap((m) => m.images || [])
      .slice(-HISTORY_IMAGES)
      .map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } }))
    history.push({
      role: 'user',
      parts: [
        { text: 'Previous conversation:\n' + recent.map((m) => `${m.role === 'user' ? 'User' : 'Agent'}: ${m.content.substring(0, HISTORY_MESSAGE_CHARS)}${m.images?.length ? ` [${m.images.length} image(s)]` : ''}`).join('\n') },
        ...(oldImages.length > 0 ? [{ text: `(the last ${oldImages.length} image(s) from the earlier messages follow)` }, ...oldImages] : []),
      ],
    })
    history.push({
      role: 'model',
      parts: [{ text: 'Understood, I have the context from our previous conversation.' }],
    })
  }

  pageStateIdx.push(history.length)
  const taskImages: Part[] = images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } }))
  const imageNote = images.length > 0 ? `\n(${images.length} image(s) from the user attached below the page screenshot)` : ''
  history.push({ role: 'user', parts: [...pageStateParts(`Task: ${task}${imageNote}\n\nCurrent page:`, pageState), ...taskImages] })

  const startTime = performance.now()
  let totalPromptTokens = 0
  let totalCandidatesTokens = 0
  let totalRequests = 0
  let peakTokens = 0
  let textOnlyStreak = 0
  const recentCalls: string[] = []
  const notes: string[] = []

  const logTotals = (label: string) => {
    const duration = ((performance.now() - startTime) / 1000).toFixed(1)
    console.log(`[Agent] ${label} | ${totalRequests} requests, ${totalPromptTokens} prompt + ${totalCandidatesTokens} response tokens, ${duration}s`)
  }

  for (let step = 0; step < MAX_STEPS; step++) {
    if (abortSignal.aborted) {
      logTotals('Stopped')
      callbacks.onDone('Agent stopped by user.')
      return
    }

    compactHistory(history, pageStateIdx, toolResultIdx)

    let result
    const requestStartTime = performance.now()
    try {
      totalRequests++
      result = await generate(history)
    } catch (err: any) {
      callbacks.onError('LLM error: ' + err.message)
      return
    }

    const usage = result.response.usageMetadata
    if (usage) {
      totalPromptTokens += usage.promptTokenCount || 0
      totalCandidatesTokens += usage.candidatesTokenCount || 0
      // Peak of the run, not the last step: later steps can be much smaller than the biggest request
      peakTokens = Math.max(peakTokens, (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0))
      callbacks.onUsage(peakTokens)
      console.log(
        `[Agent Step ${step + 1}] ${usage.promptTokenCount} prompt + ${usage.candidatesTokenCount} response tokens, ` +
        `${((performance.now() - requestStartTime) / 1000).toFixed(2)}s`,
      )
    }

    const candidate = result.response.candidates?.[0]
    if (!candidate?.content?.parts) {
      callbacks.onError('No response from LLM')
      return
    }

    // Keep parts as-is: Gemini 3 needs thought signatures echoed back
    history.push({ role: 'model', parts: candidate.content.parts })

    const functionCalls = candidate.content.parts.filter((p) => p.functionCall)
    const textParts = candidate.content.parts.filter((p) => p.text && !(p as any).thought).map((p) => p.text).join('')

    if (functionCalls.length === 0) {
      textOnlyStreak++
      // Second text-only reply in a row is almost always the final answer
      if (textOnlyStreak >= 2 && textParts) {
        logTotals('Finished with text')
        callbacks.onDone(textParts)
        return
      }
      history.push({
        role: 'user',
        parts: [{ text: 'Use a tool call. If the task is complete, call "done" with the answer.' }],
      })
      continue
    }
    textOnlyStreak = 0

    const functionResponseParts: Part[] = []

    for (const part of functionCalls) {
      const call = part.functionCall!
      const args = (call.args || {}) as Record<string, any>

      if (abortSignal.aborted) {
        callbacks.onDone('Agent stopped by user.')
        return
      }

      let actionResult: string

      try {
        switch (call.name) {
          case 'web_search':
            callbacks.onThinking(`Searching: ${args.query}`)
            actionResult = await webSearch(genAI, args.query)
            break
          case 'read_url':
            callbacks.onThinking(`Reading ${args.url}...`)
            actionResult = await readUrl(args.url, args.offset || 0)
            break
          case 'click':
            callbacks.onThinking(`Clicking element [${args.index}]...`)
            actionResult = await clickElement(args.index, currentElements)
            break
          case 'type_text':
            callbacks.onThinking(`Typing "${args.text}" into [${args.index}]...`)
            actionResult = await typeText(args.index, args.text, currentElements)
            break
          case 'press_key':
            callbacks.onThinking(`Pressing ${args.key}...`)
            actionResult = await pressKey(args.key)
            break
          case 'scroll':
            callbacks.onThinking(`Scrolling ${args.direction}...`)
            actionResult = await scrollPage(args.direction)
            break
          case 'navigate':
            callbacks.onThinking(`Navigating to ${args.url}...`)
            actionResult = await navigateTo(args.url)
            break
          case 'get_text':
            callbacks.onThinking('Reading page content...')
            actionResult = await getPageText(args.offset || 0)
            break
          case 'save_note':
            notes.push(args.note)
            actionResult = `Saved (${notes.length} notes).`
            break
          case 'wait': {
            const secs = Math.min(Math.max(args.seconds || 2, 1), 5)
            callbacks.onThinking(`Waiting ${secs}s...`)
            await new Promise((r) => setTimeout(r, secs * 1000))
            actionResult = `Waited ${secs} seconds`
            break
          }
          case 'ask_user':
            callbacks.onThinking('Waiting for your response...')
            callbacks.onAction({ tool: 'ask_user', args, result: args.question })
            actionResult = await callbacks.onAskUser(args.question)
            break
          case 'done':
            callbacks.onAction({ tool: 'done', args, result: args.summary })
            logTotals('Task completed')
            callbacks.onDone(args.summary)
            return
          default:
            actionResult = `Unknown tool: ${call.name}`
        }
      } catch (err: any) {
        actionResult = `Error executing ${call.name}: ${err.message}`
      }

      // Loop guard: the same call 3 times among the last 4 means the agent is stuck
      const signature = call.name + JSON.stringify(args)
      recentCalls.push(signature)
      if (recentCalls.slice(-4).filter((s) => s === signature).length >= 3) {
        actionResult += '\n\nWARNING: you repeated this exact action 3 times without progress. Change approach: different element or query, web_search, read_url, or ask_user.'
      }

      callbacks.onAction({ tool: call.name, args, result: actionResult })

      functionResponseParts.push({
        functionResponse: {
          name: call.name,
          response: { result: actionResult },
        },
      })
    }

    toolResultIdx.push(history.length)
    const toolTurn: Content = { role: 'user', parts: functionResponseParts }
    history.push(toolTurn)

    if (functionCalls.every((p) => NO_PAGE_CHANGE.has(p.functionCall!.name))) continue

    // Wait for page to update — longer for navigation actions, shorter for others
    const lastAction = functionCalls[functionCalls.length - 1]?.functionCall?.name
    const waitMs = ['click', 'navigate', 'press_key'].includes(lastAction || '') ? 1500 : 500
    await new Promise((r) => setTimeout(r, waitMs))

    try {
      const newState = await getPageState()
      currentElements = newState.elements
      callbacks.onScreenshot(newState.screenshot)
      pageStateIdx.push(history.length - 1)
      toolTurn.parts.push(...pageStateParts('Page updated.', newState))
    } catch {
      // Page still loading — model will act on function response alone
    }
  }

  // Reached step limit — ask the model to summarize what it found
  callbacks.onThinking('Summarizing results...')
  compactHistory(history, pageStateIdx, toolResultIdx)
  const finalPrompt: Part = { text: 'Step limit reached. Call "done" now with the concrete results found so far (names, prices, links) and briefly what remains unconfirmed.' }
  const lastTurn = history[history.length - 1]
  if (lastTurn.role === 'user') lastTurn.parts.push(finalPrompt)
  else history.push({ role: 'user', parts: [finalPrompt] })
  const notesFallback = notes.length > 0 ? `Reached step limit. Findings so far:\n${notes.map((n) => `- ${n}`).join('\n')}` : ''
  try {
    const finalResult = await generate(history)
    const parts = finalResult.response.candidates?.[0]?.content?.parts || []
    const doneCall = parts.find((p) => p.functionCall?.name === 'done')
    const finalText = parts.filter((p) => p.text && !(p as any).thought).map((p) => p.text).join('')
    callbacks.onDone((doneCall?.functionCall?.args as any)?.summary || finalText || notesFallback || 'Reached maximum steps limit. The task may not be fully complete.')
  } catch {
    callbacks.onDone(notesFallback || 'Reached maximum steps limit. The task may not be fully complete.')
  }
  logTotals('Step limit')
}
