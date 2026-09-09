import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

// GET /api/receipts/[id] — serves a stored receipt image.
//
// /api/manual-transactions has always returned `receiptUrl: /api/receipts/<id>`
// for transactions with an attachment, but the route did not exist, so every
// receipt link 404'd.

// Only formats a browser will render inline are served as-is. Anything else is
// forced to download, so a file stored with a script-ish MIME type cannot be
// executed in the app's own origin.
const INLINE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'])

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    // Scoped by userId: a receipt is a picture of someone's spending, and an
    // id-only lookup would let any signed-in user read another's.
    const receipt = await prisma.receipt.findFirst({
      where: { id, userId: session.user.id },
      select: { data: true, mimeType: true, filename: true },
    })

    if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })

    const inline = INLINE_TYPES.has(receipt.mimeType)
    const safeName = receipt.filename.replace(/[^\w.\-]/g, '_')

    return new NextResponse(Buffer.from(receipt.data), {
      headers: {
        'Content-Type': inline ? receipt.mimeType : 'application/octet-stream',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`,
        'Content-Length': String(receipt.data.length),
        // Receipts are personal. Cache in the browser only, never in a shared
        // proxy, and revalidate rather than serving a stale image after
        // the user deletes it.
        'Cache-Control': 'private, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    logger.error('Receipt fetch failed', { userId: session.user.id, receiptId: id, error: err })
    const { error, status } = errorResponse(err, 'We could not load that receipt.')
    return NextResponse.json({ error }, { status })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { count } = await prisma.receipt.deleteMany({ where: { id, userId: session.user.id } })
  if (count === 0) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
