import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const onlineUsers = await prisma.user.findMany({
      where: { status: 'ONLINE' },
      select: {
        id: true,
        email: true,
        name: true,
        status: true
      }
    })

    return NextResponse.json({
      success: true,
      users: onlineUsers
    })
  } catch (error) {
    console.error('Get online users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}