import React, { useState, useCallback } from 'react'
import type { ImageAttachment } from '../../shared/types'

// Paste / drop / file-picker image handling shared by Chat and CompactChat
export function useImageAttachments() {
  const [images, setImages] = useState<ImageAttachment[]>([])

  const addFile = useCallback((file: File, fallbackName = 'image') => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      setImages((prev) => [...prev, { data: base64, mimeType: file.type, name: file.name || fallbackName }])
    }
    reader.readAsDataURL(file)
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    for (const item of e.clipboardData.items) {
      if (!item.type.startsWith('image/')) continue
      e.preventDefault()
      const file = item.getAsFile()
      if (file) addFile(file, 'pasted-image')
    }
  }, [addFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    for (const file of e.dataTransfer.files) addFile(file)
  }, [addFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    for (const file of e.target.files || []) addFile(file)
    e.target.value = ''
  }, [addFile])

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearImages = useCallback(() => setImages([]), [])

  return { images, handlePaste, handleDrop, handleFileSelect, removeImage, clearImages }
}
