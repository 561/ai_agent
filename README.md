# AI Agent

Multi-platform desktop AI assistant with global hotkey activation, chat presets, and multi-provider LLM support.

## Features

- **Global Hotkey** — Press `Ctrl+Shift+Space` to instantly summon the assistant at your cursor or a pinned location
- **Multi-provider** — Gemini, Claude, and OpenAI API support (Gemini implemented first)
- **Preset Tabs** — Configurable instruction templates (Code, Translation, Writing, General)
- **Send Selected Text** — Highlight text anywhere, press a hotkey to send it directly to the chat
- **Image Support** — Paste or drag images into the chat for vision-capable models
- **Chat History** — Conversations persist between sessions
- **System Tray** — Quick access from the tray icon

## Tech Stack

- Electron + React + TypeScript
- Tailwind CSS
- Vite + electron-builder
- Google Generative AI SDK

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for Linux (.deb / .AppImage)
npm run build:linux
```

## Configuration

1. Launch the app
2. Open Settings (gear icon)
3. Enter your Gemini API key
4. Customize the global hotkey and window position mode

## Hotkeys

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+Space` | Toggle assistant window |
| `Ctrl+Shift+V` | Send selected text to chat |

## License

MIT
