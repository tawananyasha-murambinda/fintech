'use client'

import { useEffect, useRef } from 'react'

export function usePushNotifications() {
  const registered = useRef(false)

  useEffect(() => {
    if (registered.current) return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (localStorage.getItem('notif_push') !== 'true') return

    registered.current = true

    // Try Capacitor native push first
    tryCapacitorPush().catch(() => {
      registerWebPush().catch(() => {})
    })

    async function tryCapacitorPush() {
      const { setupCapacitorPush } = await import('@/lib/capacitor-push')
      await setupCapacitorPush()
    }

    async function registerWebPush() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')

        let sub = await reg.pushManager.getSubscription()

        const publicKeyRes = await fetch('/api/push/public-key')
        const { publicKey } = await publicKeyRes.json()
        if (!publicKey) return

        if (!sub) {
          const permission = await Notification.requestPermission()
          if (permission !== 'granted') return

          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
          })
        }

        await fetch('/api/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: {
              endpoint: sub.endpoint,
              keys: {
                p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))),
                auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))),
              },
            },
          }),
        })
      } catch (err) {
        console.error('Push registration failed:', err)
      }
    }
  }, [])
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buffer = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    buffer[i] = rawData.charCodeAt(i)
  }
  return buffer
}
