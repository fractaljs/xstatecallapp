import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, createAuthResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request)
    const { callId } = await request.json()

    if (!callId) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      )
    }

    const userId = payload.userId

    const call = await prisma.call.findUnique({
      where: { id: callId }
    })

    if (!call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      )
    }

    if (call.status === 'ENDED') {
      return NextResponse.json(
        { error: 'Cannot join ended call' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const existingParticipant = await prisma.callParticipant.findUnique({
      where: {
        callId_userId: {
          callId,
          userId
        }
      }
    })

    if (existingParticipant && !existingParticipant.leftAt && existingParticipant.status === 'CONNECTED') {
      return NextResponse.json(
        { error: 'User already connected to call' },
        { status: 400 }
      )
    }

    if (existingParticipant) {
      await prisma.callParticipant.update({
        where: { id: existingParticipant.id },
        data: {
          status: 'CONNECTED',
          leftAt: null,
          joinedAt: existingParticipant.leftAt ? new Date() : existingParticipant.joinedAt
        }
      })
    } else {
      await prisma.callParticipant.create({
        data: {
          callId,
          userId,
          role: 'PARTICIPANT',
          status: 'CONNECTED'
        }
      })
    }

    if (call.status === 'PENDING') {
      await prisma.call.update({
        where: { id: callId },
        data: { status: 'ACTIVE' }
      })
    }

    const updatedCall = await prisma.call.findUnique({
      where: { id: callId },
      include: {
        participants: {
          where: { leftAt: null },
          include: { user: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      call: updatedCall
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication failed') {
      return createAuthResponse('Authentication required')
    }
    
    console.error('Join call error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}