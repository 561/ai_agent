import { createContext, useContext } from 'react'

export type Language = 'en' | 'ru'

const translations = {
  en: {
    // Settings
    settings: 'Settings',
    general: 'General',
    apiKeys: 'API Keys',
    appearance: 'Appearance',
    integrations: 'Integrations',
    language: 'Language',
    aiProvider: 'AI Provider',
    geminiModel: 'Gemini Model',
    toggleWindowHotkey: 'Toggle Window Hotkey',
    switchTabsHotkey: 'Switch Tabs Hotkey',
    windowPosition: 'Window Position',
    atCursor: 'At Cursor',
    pinned: 'Pinned',
    fontSize: 'Font Size',
    accentColor: 'Accent Color',
    backgroundColor: 'Background Color',
    surfaceColor: 'Surface Color (panels, inputs, buttons)',
    textColor: 'Text Color',
    editPresetTabs: 'Edit Preset Tabs',

    // API Keys
    geminiApiKey: 'Gemini API Key',
    claudeApiKey: 'Claude API Key',
    openaiApiKey: 'OpenAI API Key',
    groqApiKey: 'Groq API Key',
    groqFreeNote: '(free — used for voice input)',
    enterGeminiKey: 'Enter your Gemini API key',
    enterClaudeKey: 'Enter your Claude API key',
    enterOpenaiKey: 'Enter your OpenAI API key',
    enterGroqKey: 'Get free key at console.groq.com',

    // Telegram
    telegramBot: 'Telegram Bot',
    telegramBotToken: 'Bot Token',
    telegramChatId: 'Chat ID',
    enterBotToken: 'Enter your Telegram bot token',
    enterChatId: 'Enter chat ID for notifications',
    telegramDescription: 'Connect a Telegram bot to receive results when agent tasks complete.',
    sendTestMessage: 'Send Test Message',
    testMessageSent: 'Test message sent!',
    testMessageFailed: 'Failed to send test message',

    // Chat
    startTyping: 'Start typing to begin a conversation',
    typeMessage: 'Type a message... (Shift+Enter for new line)',
    voiceInputRequiresKey: 'Voice input requires a Groq API key (free).\nGet one at console.groq.com and add it in Settings.',
    micDenied: 'Microphone access denied.',
    transcriptionEmpty: 'Transcription returned empty result.',
    transcriptionFailed: 'Transcription failed. Check your Groq API key in Settings.',
    stopRecording: 'Stop recording',
    transcribing: 'Transcribing...',
    voiceInput: 'Voice input',
    stop: 'Stop',
    send: 'Send',
    attachImage: 'Attach image',

    // TabBar
    addPreset: 'Add preset',
    edit: 'Edit',
    clearChat: 'Clear chat',
    agentWaitingForUser: 'Action needed — complete the task in the browser, then continue',
    agentContinue: 'Continue',
    clearAgent: 'Clear agent',
    deleteTab: 'Delete tab',
    hide: 'Hide',

    // Preset Editor
    sendResultToTelegram: 'Send result to Telegram',
    telegramNotifyHint: 'Agent will send task results to your Telegram when done',
    telegramNotConfigured: 'Configure Telegram bot in Settings → Integrations first',
    editPresets: 'Edit Presets',
    tabType: 'Tab Type',
    chat: 'Chat',
    agentBrowser: 'Agent (Browser)',
    systemInstruction: 'System instruction...',
    agentInstructions: 'Agent instructions...',
    aiProviderDefault: 'AI Provider (default)',
    aiModelDefault: 'AI Model (default)',
    useGlobalDefault: 'Use global default',
    delete: 'Delete',
    done: 'Done',
    addPresetBtn: '+ Add Preset',
    pressKeyCombination: 'Press a key combination...',

    // Presets
    presets: 'Presets',

    // HotkeyInput
    typeManually: 'Type manually',
  },
  ru: {
    settings: 'Настройки',
    general: 'Основные',
    apiKeys: 'API Ключи',
    appearance: 'Оформление',
    integrations: 'Интеграции',
    language: 'Язык',
    aiProvider: 'AI Провайдер',
    geminiModel: 'Модель Gemini',
    toggleWindowHotkey: 'Горячая клавиша окна',
    switchTabsHotkey: 'Переключение вкладок',
    windowPosition: 'Позиция окна',
    atCursor: 'У курсора',
    pinned: 'Закрепить',
    fontSize: 'Размер шрифта',
    accentColor: 'Акцентный цвет',
    backgroundColor: 'Цвет фона',
    surfaceColor: 'Цвет поверхности (панели, поля, кнопки)',
    textColor: 'Цвет текста',
    editPresetTabs: 'Редактировать вкладки',

    geminiApiKey: 'Ключ Gemini API',
    claudeApiKey: 'Ключ Claude API',
    openaiApiKey: 'Ключ OpenAI API',
    groqApiKey: 'Ключ Groq API',
    groqFreeNote: '(бесплатно — для голосового ввода)',
    enterGeminiKey: 'Введите ключ Gemini API',
    enterClaudeKey: 'Введите ключ Claude API',
    enterOpenaiKey: 'Введите ключ OpenAI API',
    enterGroqKey: 'Получите бесплатный ключ на console.groq.com',

    telegramBot: 'Telegram Бот',
    telegramBotToken: 'Токен бота',
    telegramChatId: 'Chat ID',
    enterBotToken: 'Введите токен Telegram бота',
    enterChatId: 'Введите chat ID для уведомлений',
    telegramDescription: 'Подключите Telegram бота для получения результатов по завершении задач агента.',
    sendTestMessage: 'Отправить тестовое сообщение',
    testMessageSent: 'Тестовое сообщение отправлено!',
    testMessageFailed: 'Не удалось отправить сообщение',

    startTyping: 'Начните вводить сообщение',
    typeMessage: 'Введите сообщение... (Shift+Enter — новая строка)',
    voiceInputRequiresKey: 'Для голосового ввода нужен ключ Groq API (бесплатно).\nПолучите на console.groq.com и добавьте в Настройках.',
    micDenied: 'Доступ к микрофону запрещён.',
    transcriptionEmpty: 'Транскрипция вернула пустой результат.',
    transcriptionFailed: 'Ошибка транскрипции. Проверьте ключ Groq API в Настройках.',
    stopRecording: 'Остановить запись',
    transcribing: 'Транскрибирую...',
    voiceInput: 'Голосовой ввод',
    stop: 'Стоп',
    send: 'Отправить',
    attachImage: 'Прикрепить изображение',

    addPreset: 'Добавить пресет',
    edit: 'Редактировать',
    clearChat: 'Очистить чат',
    agentWaitingForUser: 'Нужно действие — выполните задачу в браузере, затем продолжите',
    agentContinue: 'Продолжить',
    clearAgent: 'Очистить агента',
    deleteTab: 'Удалить вкладку',
    hide: 'Скрыть',

    sendResultToTelegram: 'Отправлять результат в Telegram',
    telegramNotifyHint: 'Агент отправит результат задачи в Telegram по завершении',
    telegramNotConfigured: 'Сначала настройте Telegram бота в Настройки → Интеграции',
    editPresets: 'Редактирование пресетов',
    tabType: 'Тип вкладки',
    chat: 'Чат',
    agentBrowser: 'Агент (Браузер)',
    systemInstruction: 'Системная инструкция...',
    agentInstructions: 'Инструкции для агента...',
    aiProviderDefault: 'AI Провайдер (по умолчанию)',
    aiModelDefault: 'AI Модель (по умолчанию)',
    useGlobalDefault: 'Использовать глобальные',
    delete: 'Удалить',
    done: 'Готово',
    addPresetBtn: '+ Добавить пресет',
    pressKeyCombination: 'Нажмите комбинацию клавиш...',

    presets: 'Пресеты',

    typeManually: 'Ввести вручную',
  },
} as const

export type TranslationKey = keyof (typeof translations)['en']

export const I18nContext = createContext<{ t: (key: TranslationKey) => string; language: Language }>({
  t: (key) => translations.en[key],
  language: 'en',
})

export function useI18n() {
  return useContext(I18nContext)
}

export function getTranslator(lang: Language) {
  return (key: TranslationKey): string => translations[lang][key] || translations.en[key]
}
