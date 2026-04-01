import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { ChatMessage } from '../../shared/types'

interface Props {
  message: ChatMessage
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`} style={{ marginBottom: 'var(--padding-lg)' }}>
      <div
        className={`max-w-[85%] min-w-0 overflow-hidden break-words rounded-2xl ${isUser ? 'bg-blue-600 text-white' : ''}`}
        style={{ padding: `var(--padding) var(--padding-lg)`, ...(!isUser ? { backgroundColor: 'var(--header)' } : {}) }}
      >
        {message.images?.map((img, i) => (
          <img
            key={i}
            src={`data:${img.mimeType};base64,${img.data}`}
            alt={img.name}
            className="max-w-full max-h-48 rounded-lg"
            style={{ marginBottom: 'var(--padding-sm)' }}
          />
        ))}
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&_p]:my-1 [&_a]:text-blue-500 [&_a]:underline [&_a:hover]:text-blue-400 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1" style={{ '--tw-prose-body': 'var(--text)', '--tw-prose-headings': 'var(--text)' } as any}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                code: ({ inline, className, children, ...props }: any) => {
                  const isInline = inline || !className?.includes('language-')
                  if (isInline) {
                    return <code className="bg-surface-300 dark:bg-surface-600 rounded text-xs" style={{ padding: `var(--padding-xs) ${6 * 0.375}px`, display: 'inline' }} {...props}>{children}</code>
                  }
                  const codeText = String(children).replace(/\n$/, '')
                  const match = /language-(\w+)/.exec(className || '')
                  const lang = match ? match[1] : 'text'
                  const codeIndex = parseInt(className?.match(/\[(\d+)\]/)?.[1] || '0')

                  return (
                    <div className="relative group bg-surface-300 dark:bg-surface-600 rounded-lg" style={{ margin: `var(--padding-sm) 0` }}>
                      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity" style={{ top: '4px', right: 'var(--padding-sm)', zIndex: 1 }}>
                        <button
                          onClick={() => copyToClipboard(codeText, codeIndex)}
                          className="text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          style={{ padding: 'var(--padding-xs) var(--padding-sm)' }}
                        >
                          {copiedIndex === codeIndex ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre className="overflow-x-auto text-xs" style={{ padding: 'var(--padding)' }}>
                        <code className={className} {...props}>{children}</code>
                      </pre>
                    </div>
                  )
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
