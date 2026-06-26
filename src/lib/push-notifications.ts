import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@fintrack.app'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

export function getVapidPublicKey(): string | null {
  return vapidPublicKey || null
}

export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; tag?: string; url?: string }
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured, skipping push notification')
    return
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    })

    const data = JSON.stringify({
      title: payload.title,
      body: payload.body,
      tag: payload.tag || 'default',
      url: payload.url || '/dashboard',
    })

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }, data)
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.deleteMany({
            where: { endpoint: sub.endpoint },
          })
        }
      }
    }
  } catch (err) {
    console.error('Push notification error:', err)
  }
}
