import { prisma } from '@/lib/prisma'
import { translate, formatMoney, isLocale, DEFAULT_LOCALE, type Locale } from '@/lib/i18n'

type NotificationType = 'bill_reminder' | 'alert' | 'goal' | 'report' | 'system'

export async function createNotification(params: {
  userId: string
  title: string
  body: string
  type: NotificationType
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      body: params.body,
      type: params.type,
    },
  })
  return notification
}

/**
 * Composes a bill reminder in the account's language and currency.
 *
 * These are written by the nightly job and stored, so — unlike the interface —
 * the language has to be resolved here. The amount previously carried a
 * hard-coded "$", which told a euro account it owed dollars.
 */
export async function notifyBillReminder(
  userId: string,
  billName: string,
  amount: number,
  dueDays: number
) {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { locale: true, currency: true },
  })
  const locale: Locale = isLocale(account?.locale) ? account.locale : DEFAULT_LOCALE
  const currency = account?.currency || 'USD'

  const when =
    dueDays === 0
      ? translate(locale, 'notifications', 'dueToday')
      : translate(locale, 'notifications', 'dueInDays', { days: dueDays })

  const title =
    dueDays === 0
      ? translate(locale, 'notifications', 'billDueToday')
      : translate(locale, 'notifications', 'billDueInDays', { days: dueDays })

  const body = translate(locale, 'notifications', 'billReminderBody', {
    name: billName,
    amount: formatMoney(locale, currency, amount),
    when,
  })

  return createNotification({ userId, title, body, type: 'bill_reminder' })
}

export async function notifyGoalAchieved(userId: string, goalName: string) {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { locale: true },
  })
  const locale: Locale = isLocale(account?.locale) ? account.locale : DEFAULT_LOCALE

  return createNotification({
    userId,
    title: translate(locale, 'notifications', 'goalReached'),
    body: translate(locale, 'notifications', 'goalReachedBody', { name: goalName }),
    type: 'goal',
  })
}

export async function notifyGoalProgress(userId: string, goalName: string, percent: number) {
  return createNotification({
    userId,
    title: 'Goal progress',
    body: `You're ${percent}% of the way to your "${goalName}" goal. Keep it up!`,
    type: 'goal',
  })
}

export async function notifyBudgetOverspent(
  userId: string,
  category: string,
  amount: number,
  budget: number
) {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { locale: true, currency: true },
  })
  const locale: Locale = isLocale(account?.locale) ? account.locale : DEFAULT_LOCALE
  const currency = account?.currency || 'USD'

  return createNotification({
    userId,
    title: translate(locale, 'alerts', 'budgetExceededTitle', { category }),
    body: translate(locale, 'alerts', 'budgetExceededMessage', {
      spent: formatMoney(locale, currency, amount),
      budget: formatMoney(locale, currency, budget),
      period: translate(locale, 'periods', 'monthly'),
      category,
      window: translate(locale, 'periods', 'thisMonth'),
    }),
    type: 'alert',
  })
}

export async function notifyReportReady(userId: string, reportName: string) {
  return createNotification({
    userId,
    title: 'Report ready',
    body: `Your ${reportName} report is ready to view.`,
    type: 'report',
  })
}
