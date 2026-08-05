import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { syncLinkedBank } from '@/lib/bank-sync'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// POST /api/plaid/webhook — receives Plaid webhooks (transactions.updated,
// item.login_required, etc.) and triggers a sync for the affected item.
// Verified with an HMAC-SHA256 signature per Plaid's webhook verification.
function verifyWebhookSignature(body: string, signature: string | null): boolean {
  const secret = process.env.PLAID_WEBHOOK_SECRET
  if (!secret) {
    logger.warn('PLAID_WEBHOOK_SECRET not configured; skipping webhook verification')
    return true
  }
  if (!signature) return false

  // Plaid signs the first 43 characters of the body (".0|version|timestamp").
  const signedPayload = body.slice(0, 43)
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('base64')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('Plaid-Verification')

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody.slice(43))
  } catch {
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid webhook body' }, { status: 400 })
    }
  }

  const { webhook_type: webhookType, webhook_code: webhookCode, item_id: itemId } = payload
  logger.info('Plaid webhook received', { webhookType, webhookCode })

  if (webhookType === 'TRANSACTIONS' && (webhookCode === 'SYNC_UPDATES_AVAILABLE' || webhookCode === 'DEFAULT_UPDATE' || webhookCode === 'INITIAL_UPDATE')) {
    const banks = await prisma.linkedBank.findMany({
      where: { plaidItemId: itemId },
    })

    if (banks.length === 0) {
      logger.warn('Webhook for unknown item', { itemId })
      return NextResponse.json({ success: true })
    }

    for (const bank of banks) {
      // Fire-and-forget: webhooks should return quickly to Plaid.
      syncLinkedBank(bank as any).then((r) => {
        logger.info('Webhook-triggered sync done', { bankId: bank.id, imported: r.imported, error: r.error })
      })
    }

    return NextResponse.json({ success: true })
  }

  if (webhookCode === 'LOGIN_REQUIRED' || webhookCode === 'PENDING_EXPIRATION') {
    const banks = await prisma.linkedBank.findMany({
      where: { plaidItemId: itemId },
      include: { user: { select: { id: true } } },
    })
    for (const bank of banks) {
      await prisma.notification.create({
        data: {
          userId: bank.userId,
          title: 'Action needed on linked account',
          body: 'Your bank requires you to re-authenticate. Open Settings → Linked Accounts to reconnect.',
          type: 'alert',
        },
      })
    }
    return NextResponse.json({ success: true })
  }

  // Acknowledge everything else so Plaid stops retrying.
  return NextResponse.json({ success: true })
}
