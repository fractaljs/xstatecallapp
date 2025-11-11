import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, createAuthResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request)
    const { receiverId, type = 'AUDIO' } = await request.json()

    const initiatorId = payload.userId

    if (receiverId) {
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId }
      })

      if (!receiver) {
        return NextResponse.json(
          { error: 'Receiver not found' },
          { status: 404 }
        )
      }
    }

    const call = await prisma.call.create({
      data: {
        initiatorId,
        receiverId,
        type,
        status: 'PENDING'
      },
      include: {
        initiator: true,
        receiver: true
      }
    })

    await prisma.callParticipant.create({
      data: {
        callId: call.id,
        userId: initiatorId,
        role: 'HOST',
        status: 'CONNECTED'
      }
    })

    if (receiverId) {
      await prisma.callParticipant.create({
        data: {
          callId: call.id,
          userId: receiverId,
          role: 'PARTICIPANT',
          status: 'CALLING'
        }
      })
    }

    const callWithParticipants = await prisma.call.findUnique({
      where: { id: call.id },
      include: {
        initiator: true,
        receiver: true,
        participants: {
          include: { user: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      call: callWithParticipants
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication failed') {
      return createAuthResponse('Authentication required')
    }
    
    console.error('Start call error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}