import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createLinkToken } from '@/lib/plaid'

// GET /api/plaid/link-token — frontend calls this to get a token to open Plaid Link
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const linkToken = await createLinkToken(session.user.id)
    return NextResponse.json({ linkToken })
  } catch (err: any) {
    console.error('Plaid link token error:', err?.response?.data || err)
    return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 })
  }
}
