import { sign, verify } from 'hono/jwt'
import type { JWTPayload } from '../types'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!
const ACCESS_EXPIRY = 8 * 60 * 60 // 8 horas en segundos

export async function signAccessToken(
  payload: Omit<JWTPayload, 'exp'>,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ACCESS_EXPIRY
  return sign({ ...payload, exp }, ACCESS_SECRET, 'HS256')
}

export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const raw = await verify(token, ACCESS_SECRET, 'HS256')
    return raw as unknown as JWTPayload
  } catch {
    return null
  }
}
