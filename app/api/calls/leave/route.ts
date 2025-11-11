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

    const participant = await prisma.callParticipant.findUnique({
      where: {
        callId_userId: {
          callId,
          userId
        }
      }
    })

    if (!participant || participant.leftAt) {
      return NextResponse.json(
        { error: 'User not in call' },
        { status: 400 }
      )
    }

    await prisma.callParticipant.update({
      where: { id: participant.id },
      data: { leftAt: new Date() }
    })

    const activeParticipants = await prisma.callParticipant.findMany({
      where: {
        callId,
        leftAt: null
      }
    })

    if (activeParticipants.length === 0) {
      await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'ENDED',
          endedAt: new Date(),
          duration: Math.floor(
            (new Date().getTime() - new Date(participant.joinedAt).getTime()) / 1000
          )
        }
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
      call: updatedCall,
      callEnded: activeParticipants.length === 0
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication failed') {
      return createAuthResponse('Authentication required')
    }
    
    console.error('Leave call error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}