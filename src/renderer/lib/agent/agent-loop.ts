import { GoogleGenerativeAI, type FunctionDeclaration, SchemaType, type Part, type Content } from '@google/generative-ai'
import {
  type InteractiveElement,
  getPageState,
  getPageText,
  clickElement,
  typeText,
  pressKey,
  scrollPage,
  navigateTo,
  formatElementsForLLM,
  launchBrowser,
} from './browser-actions'

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
  onDone: (summary: string) => void
  onError: (error: string) => void
}

const TOOLS: FunctionDeclaration[] = [
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
    description: 'Navigate to a specific URL',
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
    description: 'Get the text content of the current page (useful for reading articles, search results, etc.)',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
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
    description: 'Call this when the task is complete. Provide a summary of what was accomplished.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        summary: { type: SchemaType.STRING, description: 'Summary of what was done and the result' },
      },
      required: ['summary'],
    },
  },
]

const SYSTEM_INSTRUCTION = `You are a browser automation agent. You control a real web browser via tools to accomplish ANY task the user requests.

CRITICAL: You MUST ALWAYS respond with a tool call. NEVER respond with plain text explaining why you can't do something. You have full browser control — use it.

You can see the current page via a screenshot and a list of interactive elements. Each element has an [index] you can reference in your actions.

## How to work:
1. Look at the screenshot and elements list to understand what's on the page
2. Think about the BEST way to accomplish the task — navigate DIRECTLY to the target website when you know it
3. Call the appropriate tool to take the next action
4. After each action, you'll receive an updated screenshot and elements list
5. Continue until the task is complete, then call "done" with a detailed summary

## IMPORTANT — navigate directly, don't Google:
- If the user mentions a specific website or service (Grab, Amazon, YouTube, Wikipedia, etc.), navigate DIRECTLY to it (e.g. "navigate" to "grab.com", "amazon.com")
- Do NOT go to Google to search for well-known websites — go to them directly
- Only use Google search when you genuinely don't know the URL or need to find something across the web
- For food delivery: Grab → grab.com, Uber Eats → ubereats.com, etc.
- For shopping: Amazon → amazon.com, eBay → ebay.com, etc.

## Important rules:
- ALWAYS respond with a tool call, never with plain text
- ONLY use element indices from the LATEST elements list you received — indices change after every page update
- If a click fails with "element not found", the page has changed. Look at the new screenshot and elements list before trying again
- After clicking links or submitting forms, use "wait" to let the page load
- If you need to read page content, use "get_text"
- If elements aren't visible, try scrolling
- Be methodical: plan your steps, execute one at a time
- If something doesn't work, try an alternative approach
- When done, call "done" with a USEFUL summary for the user: what you found, key results, prices, names, links — real actionable information. Do NOT list your actions (clicked X, typed Y) — the user doesn't care about that. Focus on the OUTCOME.

## When to ask the user for help:
- CAPTCHA or bot verification — ask the user to solve it in the browser window, then continue
- Login or authentication required — ask the user to log in in the browser window, then continue
- Ambiguous choice — ask which option they prefer
- Unexpected error or blocker you cannot work around
Use "ask_user" tool for these cases. After the user responds, continue with the task.`

export async function runAgentLoop(
  apiKey: string,
  model: string,
  task: string,
  callbacks: AgentStepCallback,
  abortSignal: { aborted: boolean },
  presetSystemInstruction?: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<void> {
  const genAI = new GoogleGenerativeAI(apiKey)

  const systemParts = [SYSTEM_INSTRUCTION]
  if (presetSystemInstruction) {
    systemParts.push('\n\nAdditional context:\n' + presetSystemInstruction)
  }

  // Enable thinking for models that support it (2.5-flash, 2.5-pro, 3.x — NOT lite)
  const supportsThinking = /gemini-(2\.5-(flash|pro)|3\.)/.test(model) && !model.includes('lite')
  const generationConfig = supportsThinking
    ? { thinkingConfig: { thinkingBudget: 4096 } } as any
    : undefined

  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemParts.join(''),
    tools: [{ functionDeclarations: TOOLS }],
    generationConfig,
  })

  // Keep track of current interactive elements for action execution
  let currentElements: InteractiveElement[] = []

  callbacks.onThinking('Launching browser...')

  try {
    await launchBrowser()
  } catch (err: any) {
    callbacks.onError('Failed to launch browser: ' + err.message)
    return
  }

  callbacks.onThinking('Analyzing the page...')

  let pageState
  try {
    pageState = await getPageState()
  } catch (err: any) {
    callbacks.onError('Failed to capture page state: ' + err.message)
    return
  }
  currentElements = pageState.elements
  callbacks.onScreenshot(pageState.screenshot)

  // Manually managed history — needed because SDK sendMessage() always uses role 'user',
  // but functionResponse requires role 'function'
  const history: Content[] = []

  // Include prior conversation messages so the agent remembers context across turns
  if (conversationHistory && conversationHistory.length > 0) {
    history.push({
      role: 'user',
      parts: [{ text: 'Previous conversation:\n' + conversationHistory.map((m) => `${m.role === 'user' ? 'User' : 'Agent'}: ${m.content}`).join('\n') }],
    })
    history.push({
      role: 'model',
      parts: [{ text: 'Understood, I have the context from our previous conversation. I will continue from where we left off.' }],
    })
  }

  history.push({
    role: 'user',
    parts: [
      { text: `Task: ${task}\n\nCurrent page: ${pageState.url}\nTitle: ${pageState.title}\n\nInteractive elements:\n${formatElementsForLLM(pageState.elements)}` },
      { inlineData: { mimeType: 'image/png', data: pageState.screenshot } },
    ],
  })

  const startTime = performance.now()
  let totalPromptTokens = 0
  let totalCandidatesTokens = 0
  let totalRequests = 0

  const MAX_STEPS = 30

  for (let step = 0; step < MAX_STEPS; step++) {
    if (abortSignal.aborted) {
      const duration = ((performance.now() - startTime) / 1000).toFixed(1)
      console.log(`[Agent] Total Stats: ${totalRequests} requests, ${totalPromptTokens + totalCandidatesTokens} tokens, ${duration}s total time`)
      callbacks.onDone('Agent stopped by user.')
      return
    }

    // Call generateContent with full history
    let result
    const requestStartTime = performance.now()
    try {
      totalRequests++
      result = await geminiModel.generateContent({ contents: history })
    } catch (err: any) {
      callbacks.onError('LLM error: ' + err.message)
      return
    }
    const requestDuration = ((performance.now() - requestStartTime) / 1000).toFixed(2)

    const usage = result.response.usageMetadata
    if (usage) {
      const p = usage.promptTokenCount || 0
      const c = usage.candidatesTokenCount || 0
      totalPromptTokens += p
      totalCandidatesTokens += c
      console.log(
        `[Agent Step ${step + 1}] Request #${totalRequests} | ` +
        `Tokens: ${p} prompt + ${c} response = ${p + c} | ` +
        `Accumulated: ${totalPromptTokens + totalCandidatesTokens} | ` +
        `Time: ${requestDuration}s`
      )
    }

    const candidate = result.response.candidates?.[0]
    if (!candidate?.content?.parts) {
      callbacks.onError('No response from LLM')
      return
    }

    // Add model response to history
    history.push({ role: 'model', parts: candidate.content.parts })

    // Check for function calls vs text
    const functionCalls = candidate.content.parts.filter((p) => p.functionCall)
    const textParts = candidate.content.parts.filter((p) => p.text).map((p) => p.text).join('')

    if (functionCalls.length === 0) {
      // Model responded with text only — retry once, reminding it to use tools
      if (step < MAX_STEPS - 1) {
        history.push({
          role: 'user',
          parts: [{ text: 'You MUST use a tool call. Do not respond with text. If you need to navigate somewhere, use the "navigate" tool. If the task is complete, call "done". Take action now.' }],
        })
        continue
      }
      callbacks.onDone(textParts || 'Agent finished (no more actions).')
      return
    }

    // Execute each function call
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
            actionResult = await getPageText()
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
            const finalDuration = ((performance.now() - startTime) / 1000).toFixed(1)
            console.log(`[Agent] Task Completed | Total Stats: ${totalRequests} requests, ${totalPromptTokens + totalCandidatesTokens} tokens, ${finalDuration}s total time`)
            callbacks.onDone(args.summary)
            return
          default:
            actionResult = `Unknown tool: ${call.name}`
        }
      } catch (err: any) {
        actionResult = `Error executing ${call.name}: ${err.message}`
      }

      callbacks.onAction({ tool: call.name, args, result: actionResult })

      functionResponseParts.push({
        functionResponse: {
          name: call.name,
          response: { result: actionResult },
        },
      })
    }

    // Add function responses with role 'function' (NOT 'user')
    history.push({ role: 'function' as any, parts: functionResponseParts })

    // Wait for page to update — longer for navigation actions, shorter for others
    const lastAction = functionCalls[functionCalls.length - 1]?.functionCall?.name
    const navActions = ['click', 'navigate', 'press_key']
    const waitMs = navActions.includes(lastAction || '') ? 1500 : 500
    await new Promise((r) => setTimeout(r, waitMs))

    try {
      const newState = await getPageState()
      currentElements = newState.elements
      callbacks.onScreenshot(newState.screenshot)
      // Add updated page state as a new user message
      history.push({
        role: 'user',
        parts: [
          { text: `Page updated.\nURL: ${newState.url}\nTitle: ${newState.title}\n\nInteractive elements:\n${formatElementsForLLM(newState.elements)}` },
          { inlineData: { mimeType: 'image/png', data: newState.screenshot } },
        ],
      })
    } catch {
      // Page still loading — model will act on function response alone
    }
  }

  // Reached step limit — ask the model to summarize what it found/did
  callbacks.onThinking('Summarizing results...')
  history.push({
    role: 'user',
    parts: [{ text: 'You have reached the maximum number of steps. Call "done" with a useful summary: what concrete results did you find? List specific names, prices, links, or answers. Then briefly note what remains to be done. Focus on VALUE to the user, not on your actions.' }],
  })
  try {
    const finalResult = await geminiModel.generateContent({ contents: history })
    const finalCandidate = finalResult.response.candidates?.[0]
    const finalText = finalCandidate?.content?.parts
      ?.filter((p) => p.text)
      .map((p) => p.text)
      .join('') || ''
    // Check if the model called done
    const doneCall = finalCandidate?.content?.parts?.find((p) => p.functionCall?.name === 'done')
    if (doneCall) {
      const summary = (doneCall.functionCall!.args as any)?.summary || finalText
      callbacks.onDone(summary)
    } else {
      callbacks.onDone(finalText || 'Reached maximum steps limit. The task may not be fully complete.')
    }
  } catch {
    callbacks.onDone('Reached maximum steps limit. The task may not be fully complete.')
  }
}
