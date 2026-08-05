import { prisma } from './prisma'

// Per-user daily AI usage budget. Enforces a hard cap per user per UTC day
// so runaway prompts cannot rack up provider cost. The in-memory rate limiter
// handles short-window throttling; this handles the daily ceiling across
// restarts (and, in the future, multiple instances).

export const DEFAULT_DAILY_AI_LIMIT = 60

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function getAiUsage(userId: string, date = todayKey()): Promise<number> {
  const row = await prisma.aiUsage.findUnique({ where: { userId_date: { userId, date } } })
  return row?.count ?? 0
}

export async function recordAiUsage(userId: string, date = todayKey()): Promise<void> {
  await prisma.aiUsage.upsert({
    where: { userId_date: { userId, date } },
    update: { count: { increment: 1 } },
    create: { userId, date, count: 1 },
  })
}

// Returns true when the user still has budget for this request.
export async function consumeAiBudget(userId: string, limit = DEFAULT_DAILY_AI_LIMIT): Promise<boolean> {
  const used = await getAiUsage(userId)
  if (used >= limit) return false
  await recordAiUsage(userId)
  return true
}
