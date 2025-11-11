import { NextRequest } from 'next/server'
import { verifyToken, extractTokenFromHeader, JWTPayload } from './jwt'

export async function authenticateRequest(request: NextRequest): Promise<JWTPayload> {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    const payload = verifyToken(token)
    return payload
  } catch (error) {
    throw new Error('Authentication failed')
  }
}

export function createAuthResponse(error: string, status: number = 401) {
  return Response.json({ error }, { status })
}