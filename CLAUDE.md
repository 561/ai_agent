# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Agent is a multi-platform Electron + React + TypeScript desktop application that provides an AI assistant with global hotkey activation, chat presets, and multi-provider LLM support (Gemini, Claude, OpenAI).

### Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Desktop**: Electron 33
- **Build**: Vite + vite-plugin-electron
- **State Management**: React hooks + electron-store for persistence
- **LLM Providers**: Google Generative AI SDK, with abstractions for Claude and OpenAI

## Repository Structure

### `src/main/`
Electron main process that manages the application window, global hotkeys, system tray, and IPC communication with the renderer.

- `index.ts` — Creates the BrowserWindow, registers global hotkeys (Ctrl+Shift+Space to toggle, Ctrl+Shift+V for selection), handles window positioning at cursor
- `ipc-handlers.ts` — IPC message handlers (receiving updates from renderer: hotkey changes, API keys, settings)
- `tray.ts` — System tray integration with context menu
- `clipboard.ts` — Clipboard access for reading selected text

**Key Concepts:**
- Window positioning uses `screen.getCursorScreenPoint()` to snap window near cursor
- Hotkeys are validated before registration with `isValidAccelerator()` to reject non-ASCII
- IPC is the bridge: main process listens for settings changes and updates hotkey registrations in real-time

### `src/renderer/`
React UI layer served by Vite dev server in development, bundled into `dist/` for production.

**Components** (`components/`):
- `App.tsx` — Root component managing view state ('chat', 'settings', 'presets'), active preset, and conversations
- `Chat.tsx` — Chat interface: message list, input, image handling, streaming text display
- `TabBar.tsx` — Preset tabs selector with Settings icon
- `Settings.tsx` — API key input, hotkey configuration, theme/window mode toggles
- `PresetEditor.tsx` — Add/edit/delete chat presets with system instructions
- `MessageBubble.tsx` — Renders individual chat messages with markdown + syntax highlighting
- `ImagePreview.tsx` — Image preview in chat messages
- `HotkeyInput.tsx` — Keyboard input component for hotkey binding

**Hooks** (`hooks/`):
- `useSettings()` — Reads/writes settings (API keys, hotkeys, theme) to electron-store
- `useChat()` — Manages conversations (create, send message, stream, clear), handles provider dispatch

**Provider System** (`lib/providers/`):
- `base.ts` — `LLMProviderInterface` (all providers implement `sendMessage()` and `isConfigured()`)
- `gemini.ts` — Google Generative AI implementation (currently the main provider)
- `claude.ts` — Anthropic Claude API stub
- `openai.ts` — OpenAI API stub
- `presets.ts` — Default preset templates (Code, Translation, Writing, General)
- `storage.ts` — electron-store wrapper for persist conversations and settings

**Key Concepts:**
- Messages flow: user input → `useChat` hook → selected provider → stream response → `Chat` component
- System instructions from presets are passed to providers for context
- Images are base64-encoded and attached to messages
- Streaming is handled via provider's `onChunk` callback

### `src/shared/`
TypeScript interfaces used by both main and renderer processes.

- `types.ts` — `ChatMessage`, `ImageAttachment`, `Preset`, `Conversation`, `AppSettings`, `LLMProvider`, `IpcChannels`

## Build & Development

### Common Commands
```bash
npm install                    # Install dependencies
npm run dev                    # Start Vite dev server + watch main process
npm run build                  # Type check → Vite build → electron-builder (cross-platform)
npm run build:linux            # Build Linux .deb and .AppImage
npm run preview                # Preview built app
npm run typecheck              # TypeScript only (no build)
```

### Development Workflow
1. `npm run dev` starts Vite on `http://localhost:5173` and watches `src/main/` for changes
2. Electron runs against the Vite dev server (configured in `createWindow()` via `VITE_DEV_SERVER_URL`)
3. Hot module reload works for React changes; main process changes require manual restart
4. Settings/chat data persists to `~/.config/ai-agent/` (electron-store default location)

### Build Output
- **Development**: Vite serves `src/renderer/` on localhost; main process runs from TypeScript
- **Production**:
  - `dist/` — React + static assets (bundled by Vite)
  - `dist-electron/main/` — Main process compiled to CommonJS by Vite
  - Built app packaged by electron-builder per platform

### TypeScript Configuration
- **Target**: ES2020, strict mode enabled
- **Module**: ESNext (Vite handles transpilation)
- **Path Alias**: `@shared` → `src/shared`
- `noUnusedLocals` and `noUnusedParameters` disabled for flexibility

## Key Implementation Patterns

### Adding a New LLM Provider
1. Create `src/renderer/lib/providers/[provider].ts` implementing `LLMProviderInterface`
2. Export a class with `name`, `sendMessage()`, `isConfigured()` methods
3. `sendMessage()` should stream chunks via the `onChunk` callback
4. Add to provider list in `useChat` hook or settings UI

### Adding a New Preset
Edit `src/renderer/lib/presets.ts` — each preset has `id`, `name`, `systemInstruction`, optional `icon`.

### Passing Data Between Main & Renderer
Use IPC:
- Renderer calls `ipcRenderer.send('channel-name', data)` or `ipcRenderer.invoke()`
- Main listens via `ipcMain.on()` or `ipcMain.handle()`
- Typed via `IpcChannels` interface in `types.ts`

Example: Hotkey change flows renderer Settings → `ipcRenderer.send('update-hotkey')` → main process updates registration.

### Persisting Data
Use electron-store via `useSettings()` or `useChat()` hooks. Storage location is platform-specific (e.g., `~/.config/ai-agent/` on Linux).

## Important Files to Know

| File | Purpose |
|------|---------|
| `src/main/index.ts` | Electron window + hotkey management |
| `src/renderer/App.tsx` | React root, view state, preset/conversation routing |
| `src/renderer/hooks/useChat.ts` | Chat logic, provider dispatch, streaming |
| `src/renderer/lib/providers/gemini.ts` | Current main LLM implementation |
| `src/shared/types.ts` | Central interface definitions |
| `vite.config.ts` | Build config (main process + renderer bundling) |
| `electron-builder.yml` | App packaging config (if exists) |

## Common Tasks

**Run the app in development**: `npm run dev` (main window + Vite dev server)

**Build for distribution**: `npm run build` (validates TS, bundles, packages)

**Debug main process**: Add `--inspect` to Electron in dev, attach debugger

**Add a chat message handler**: Extend `useChat` hook in `src/renderer/hooks/useChat.ts`

**Change window behavior**: Edit `createWindow()` or `showWindowAtCursor()` in `src/main/index.ts`

**Modify settings UI**: Edit `src/renderer/components/Settings.tsx` and update `AppSettings` interface in `types.ts`

## Notes on Testing & Validation

- TypeScript strict mode catches most errors at compile time
- Hotkey validation rejects non-ASCII accelerators to prevent Electron registration failures
- Window positioning is bounded to prevent off-screen placement
- IPC channels are typed to catch message mismatches early
