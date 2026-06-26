'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  disabled?: boolean
}

export function usePullToRefresh({ onRefresh, threshold = 80, disabled = false }: PullToRefreshOptions) {
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || refreshing) return
    if (containerRef.current && containerRef.current.scrollTop > 0) return
    startY.current = e.touches[0].clientY
    setPulling(true)
  }, [disabled, refreshing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling || refreshing) return
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0) {
      const damped = diff * 0.4
      setPullDistance(Math.min(damped, threshold * 1.5))
    }
  }, [pulling, refreshing, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!pulling || refreshing) return
    setPulling(false)
    if (pullDistance >= threshold) {
      setRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setTimeout(() => {
          setRefreshing(false)
          setPullDistance(0)
        }, 500)
      }
    } else {
      setPullDistance(0)
    }
  }, [pulling, refreshing, pullDistance, threshold, onRefresh])

  useEffect(() => {
    const el = containerRef.current
    if (!el || disabled) return
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd)
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled])

  return {
    containerRef,
    pullDistance,
    refreshing,
    pullIndicator: refreshing || pullDistance > 10,
  }
}
