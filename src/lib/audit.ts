import { prisma } from './prisma'
import type { NextRequest } from 'next/server'

type AuditMeta = {
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

export function requestMeta(req: NextRequest): Pick<AuditMeta, 'ip' | 'userAgent'> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    undefined
  const userAgent = req.headers.get('user-agent') || undefined
  return { ip, userAgent }
}

// Best-effort, non-blocking audit write. Never throws into the caller.
export async function logAudit(
  userId: string | null | undefined,
  action: string,
  meta: AuditMeta = {}
): Promise<void> {
  if (!action) return
  try {
    await prisma.auditLog.create({
      data: {
        ...(userId ? { userId } : {}),
        action,
        ip: meta.ip,
        userAgent: meta.userAgent,
        metadata: meta.metadata as any,
      },
    })
  } catch (err) {
    console.error(`Audit log write failed (${action}):`, err)
  }
}
