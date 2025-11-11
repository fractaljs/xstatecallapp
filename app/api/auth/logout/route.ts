import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, createAuthResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request)

    await prisma.user.update({
      where: { id: payload.userId },
      data: { status: 'OFFLINE' }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication failed') {
      return createAuthResponse('Authentication required')
    }
    
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}