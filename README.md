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

# Build for Windows (.exe installer)
npm run build:win
```

## Установка на Linux после сборки

```bash
# Установить .deb пакет
sudo apt install ./release/ai-agent_1.1.0_amd64.deb

# Дать нужные права sandbox (обязательно после каждой установки)
sudo chown root "/opt/ai-agent/chrome-sandbox"
sudo chmod 4755 "/opt/ai-agent/chrome-sandbox"

# Запустить
ai-agent
```

Нажми `Ctrl+Shift+Space` чтобы показать/скрыть окно.

Либо запусти `.AppImage` без установки:

```bash
chmod +x ./release/ai-agent-1.1.0.AppImage
./release/ai-agent-1.1.0.AppImage --no-sandbox
```

## Building for Windows

### On Windows (нативно)

1. Установи [Node.js](https://nodejs.org/) (LTS версия)
2. Установи [Git](https://git-scm.com/)
3. Клонируй репозиторий и установи зависимости:
   ```cmd
   git clone <repo-url>
   cd ai_agent
   npm install
   npm run build:win
   ```
4. Готовый установщик будет в папке `release/` — файл `ai-agent Setup 1.1.0.exe`

### На Linux (кросс-компиляция для Windows)

**Рекомендуется собирать нативно на Windows.** Кросс-компиляция с Linux требует Wine:

```bash
sudo apt install wine64
npm run build:win
```

Если Wine установлен, но сборка падает на подписи — отключи подпись:

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run build:win
```

### После установки на Windows

При первом запуске Windows может показать предупреждение SmartScreen — нажми **"Подробнее" → "Выполнить"**. Это стандартное предупреждение для неподписанных приложений.

Приложение устанавливается в `%LOCALAPPDATA%\Programs\ai-agent\`.

### Иконка в системном трее

После запуска приложение живёт в системном трее (правый нижний угол). Нажми на иконку или используй горячую клавишу `Ctrl+Shift+Space` чтобы открыть окно.

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
