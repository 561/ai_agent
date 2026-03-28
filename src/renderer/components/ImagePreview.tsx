import React from 'react'
import type { ImageAttachment } from '../../shared/types'

interface Props {
  images: ImageAttachment[]
  onRemove: (index: number) => void
}

export function ImagePreview({ images, onRemove }: Props) {
  if (images.length === 0) return null

  return (
    <div className="flex gap-2 px-3 py-2 overflow-x-auto">
      {images.map((img, i) => (
        <div key={i} className="relative flex-shrink-0">
          <img
            src={`data:${img.mimeType};base64,${img.data}`}
            alt={img.name}
            className="h-16 w-16 object-cover rounded-lg border border-surface-200 dark:border-surface-700"
          />
          <button
            onClick={() => onRemove(i)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
          >
            x
          </button>
        </div>
      ))}
    </div>
  )
}
