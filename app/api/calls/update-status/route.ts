import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, createAuthResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request)
    const { callId, status } = await request.json()

    if (!callId || !status) {
      return NextResponse.json(
        { error: 'Call ID and status are required' },
        { status: 400 }
      )
    }

    const userId = payload.userId

    const validStatuses = ['CALLING', 'CONNECTED', 'DISCONNECTED', 'FAILED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const participant = await prisma.callParticipant.findUnique({
      where: {
        callId_userId: {
          callId,
          userId
        }
      }
    })

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }

    await prisma.callParticipant.update({
      where: { id: participant.id },
      data: { status }
    })

    const updatedCall = await prisma.call.findUnique({
      where: { id: callId },
      include: {
        participants: {
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
    
    console.error('Update participant status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}