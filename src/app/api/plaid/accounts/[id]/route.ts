import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/plaid/accounts/[id] — unlink a bank account for the current user
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    // Ensure the bank belongs to the current user before deleting
    const bank = await prisma.linkedBank.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!bank) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    await prisma.linkedBank.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Plaid accounts unlink error:', err)
    return NextResponse.json({ error: 'Failed to unlink account' }, { status: 500 })
  }
}
