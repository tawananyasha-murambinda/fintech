import { prisma } from '@/lib/prisma'

// Notification preferences.
//
// These lived in localStorage, which the nightly job cannot read — so muting
// bill reminders changed nothing and the phone still buzzed. Now that alerts
// push to a device, ignoring a mute is the kind of thing that gets an app
// deleted rather than merely annoying someone.

export type NotificationChannel = 'push' | 'email'
export type NotificationKind = 'bills' | 'alerts' | 'goals'

export type Preferences = {
  push: boolean
  email: boolean
  bills: boolean
  alerts: boolean
  goals: boolean
}

export const DEFAULT_PREFERENCES: Preferences = {
  push: true,
  email: true,
  bills: true,
  alerts: true,
  goals: true,
}

export async function preferencesFor(userId: string): Promise<Preferences> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        notifyPush: true,
        notifyEmail: true,
        notifyBills: true,
        notifyAlerts: true,
        notifyGoals: true,
      },
    })

    if (!user) return DEFAULT_PREFERENCES

    return {
      push: user.notifyPush,
      email: user.notifyEmail,
      bills: user.notifyBills,
      alerts: user.notifyAlerts,
      goals: user.notifyGoals,
    }
  } catch {
    // A read failure must not silence a reminder someone is relying on, so the
    // default is to deliver.
    return DEFAULT_PREFERENCES
  }
}

/**
 * Whether a notification of this kind should be delivered on this channel.
 *
 * Both have to be on: muting "push" silences every push, muting "bills"
 * silences bill reminders everywhere.
 */
export function shouldDeliver(
  prefs: Preferences,
  kind: NotificationKind,
  channel: NotificationChannel
): boolean {
  return prefs[channel] && prefs[kind]
}
