import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

// POST /api/receipts — stores a receipt image or PDF.
//
// The Receipt table and a `receiptId` on manual transactions already existed,
// and `/api/manual-transactions` returned a `receiptUrl` for them — but nothing
// in the app ever created one, so the whole feature was unreachable.

const MAX_BYTES = 8 * 1024 * 1024

// Only formats a browser will render, and nothing that can carry script. SVG is
// deliberately excluded: it is an executable document, and these are served
// back from the app's own origin.
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'application/pdf'])

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const receipts = await prisma.receipt.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    // The file bytes are deliberately not selected — listing receipts should
    // not pull megabytes of image data through the API.
    select: { id: true, filename: true, mimeType: true, createdAt: true },
    take: 100,
  })

  return NextResponse.json({
    receipts: receipts.map((r) => ({ ...r, url: `/api/receipts/${r.id}` })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await rateLimit(req, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
    key: `receipt-upload:${session.user.id}`,
    scope: 'user',
  })
  if (limited) return limited

  try {
    const form = await req.formData()
    const file = form.get('file')
    const manualId = form.get('manualTransactionId')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Attach a photo or PDF of the receipt.' }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'That file is empty.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Receipts must be under ${MAX_BYTES / 1024 / 1024}MB.` },
        { status: 413 }
      )
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: 'Use a photo (PNG, JPEG, WebP, HEIC) or a PDF.' },
        { status: 415 }
      )
    }

    const bytes = Buffer.from(await file.arrayBuffer())

    const receipt = await prisma.receipt.create({
      data: {
        userId: session.user.id,
        filename: file.name.slice(0, 200) || 'receipt',
        mimeType: file.type,
        data: bytes,
      },
      select: { id: true, filename: true, mimeType: true, createdAt: true },
    })

    // Attaching on upload, scoped to the caller so a guessed id cannot bind a
    // receipt onto someone else's transaction.
    if (typeof manualId === 'string' && manualId) {
      await prisma.manualTransaction.updateMany({
        where: { id: manualId, userId: session.user.id },
        data: { receiptId: receipt.id },
      })
    }

    return NextResponse.json({ receipt: { ...receipt, url: `/api/receipts/${receipt.id}` } }, { status: 201 })
  } catch (err) {
    logger.error('Receipt upload failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not save that receipt.')
    return NextResponse.json({ error }, { status })
  }
}
