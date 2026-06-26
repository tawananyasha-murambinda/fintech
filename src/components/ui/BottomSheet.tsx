'use client'

import { useEffect, useRef, useState } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const [visible, setVisible] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)

  useEffect(() => {
    if (open) {
      setVisible(true)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      const t = setTimeout(() => setVisible(false), 200)
      return () => clearTimeout(t)
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleBackdropClick = () => onClose()

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!sheetRef.current) return
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0) {
      sheetRef.current.style.transform = `translateY(${diff}px)`
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!sheetRef.current) return
    const diff = e.changedTouches[0].clientY - startY.current
    sheetRef.current.style.transform = ''
    if (diff > 100) onClose()
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={handleBackdropClick}>
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ animation: open ? 'fadeIn 0.15s ease-out' : 'none' }}
      />
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full max-h-[80vh] bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl transition-transform duration-200 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={e => e.stopPropagation()}
        style={{ animation: open ? 'slideUp 0.2s ease-out' : 'none' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>
        {title && (
          <div className="px-5 pb-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          </div>
        )}
        <div className="px-5 pb-5 overflow-y-auto max-h-[calc(80vh-60px)]">
          {children}
        </div>
      </div>
    </div>
  )
}
