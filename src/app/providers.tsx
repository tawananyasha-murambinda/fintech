'use client'

import { SessionProvider } from 'next-auth/react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

function PushNotificationSetup() {
  usePushNotifications()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PushNotificationSetup />
      {children}
    </SessionProvider>
  )
}
