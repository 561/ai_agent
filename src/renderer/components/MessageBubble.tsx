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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${isUser ? 'bg-blue-600 text-white' : ''}`}
        style={!isUser ? { backgroundColor: 'var(--header)' } : undefined}
      >
        {message.images?.map((img, i) => (
          <img
            key={i}
            src={`data:${img.mimeType};base64,${img.data}`}
            alt={img.name}
            className="max-w-full max-h-48 rounded-lg mb-2"
          />
        ))}
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&_p]:my-1 [&_strong]:text-base [&_a]:text-blue-500 [&_a]:underline [&_a:hover]:text-blue-400 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-1">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                code: ({ inline, className, children, ...props }: any) => {
                  if (inline) {
                    return <code className="bg-surface-300 dark:bg-surface-600 px-1.5 py-0.5 rounded text-xs" {...props}>{children}</code>
                  }
                  const codeText = String(children).replace(/\n$/, '')
                  const match = /language-(\w+)/.exec(className || '')
                  const lang = match ? match[1] : 'text'
                  const codeIndex = parseInt(className?.match(/\[(\d+)\]/)?.[1] || '0')

                  return (
                    <div className="relative group bg-surface-300 dark:bg-surface-600 rounded-lg overflow-hidden my-2">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyToClipboard(codeText, codeIndex)}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          title="Copy code"
                        >
                          {copiedIndex === codeIndex ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre className="overflow-x-auto p-3 text-xs">
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
