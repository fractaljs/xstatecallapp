import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, createAuthResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request)
    const { receiverIds = [], type = 'AUDIO' } = await request.json()

    const initiatorId = payload.userId

    // Validate all receiver IDs exist
    if (receiverIds.length > 0) {
      const receivers = await prisma.user.findMany({
        where: { id: { in: receiverIds } }
      })

      if (receivers.length !== receiverIds.length) {
        const foundIds = receivers.map(r => r.id)
        const missingIds = receiverIds.filter(id => !foundIds.includes(id))
        return NextResponse.json(
          { error: `Receivers not found: ${missingIds.join(', ')}` },
          { status: 404 }
        )
      }
    }

    const call = await prisma.call.create({
      data: {
        initiatorId,
        type,
        status: 'PENDING'
      },
      include: {
        initiator: true
      }
    })

    // Create host participant for the initiator
    await prisma.callParticipant.create({
      data: {
        callId: call.id,
        userId: initiatorId,
        role: 'HOST',
        status: 'CONNECTED'
      }
    })

    // Create participant entries for all receivers (excluding the initiator to avoid duplicates)
    const participantReceiverIds = receiverIds.filter(id => id !== initiatorId);
    if (participantReceiverIds.length > 0) {
      await prisma.callParticipant.createMany({
        data: participantReceiverIds.map(receiverId => ({
          callId: call.id,
          userId: receiverId,
          role: 'PARTICIPANT',
          status: 'CALLING'
        }))
      })
    }

    const callWithParticipants = await prisma.call.findUnique({
      where: { id: call.id },
      include: {
        initiator: true,
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