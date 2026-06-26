import { prisma } from '@/lib/prisma'

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

export async function notifyBillReminder(userId: string, billName: string, amount: number, dueDays: number) {
  const title = dueDays === 0 ? 'Bill due today' : `Bill due in ${dueDays} day${dueDays > 1 ? 's' : ''}`
  const body = dueDays === 0
    ? `${billName} — $${amount.toFixed(2)} is due today.`
    : `${billName} — $${amount.toFixed(2)} is due in ${dueDays} day${dueDays > 1 ? 's' : ''}.`

  return createNotification({ userId, title, body, type: 'bill_reminder' })
}

export async function notifyGoalAchieved(userId: string, goalName: string) {
  return createNotification({
    userId,
    title: 'Goal achieved!',
    body: `Congratulations! You reached your "${goalName}" savings goal.`,
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

export async function notifyBudgetOverspent(userId: string, category: string, amount: number, budget: number) {
  return createNotification({
    userId,
    title: 'Budget overspent',
    body: `You've spent $${amount.toFixed(2)} in ${category} — over your $${budget.toFixed(2)} budget.`,
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
