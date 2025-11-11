import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    let user = await prisma.user.findUnique({
      where: { email: username }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: username,
          name: username,
          status: 'ONLINE'
        }
      })
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { status: 'ONLINE' }
      })
    }

    const token = signToken({
      userId: user.id,
      email: user.email
    })

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}