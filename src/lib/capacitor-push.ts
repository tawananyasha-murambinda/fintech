let PushNotifications: any = null

export async function setupCapacitorPush() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem('notif_push') !== 'true') return

  try {
    PushNotifications = (await import('@capacitor/push-notifications')).PushNotifications
  } catch {
    return
  }

  await PushNotifications.requestPermissions()
  await PushNotifications.register()

  PushNotifications.addListener('registration', async (token: any) => {
    const sub = {
      endpoint: `https://push.google.com/fcm/v1/${token.value}`,
      keys: { p256dh: '', auth: '' },
    }
    await fetch('/api/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub }),
    })
  })

  PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
    const title = notification.title || 'FinTrack'
    const body = notification.body || ''
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  })
}
