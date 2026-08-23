import { sign, verify } from 'hono/jwt'
import type { AccessTokenPayload } from '../types'

const ACCESS_EXPIRY = 8 * 60 * 60 // 8 horas en segundos

function accessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET debe tener al menos 32 caracteres')
  }
  return secret
}

export async function signAccessToken(sub: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ACCESS_EXPIRY
  return sign({ sub, exp }, accessSecret(), 'HS256')
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const raw = await verify(token, accessSecret(), 'HS256')
    if (typeof raw.sub !== 'string' || typeof raw.exp !== 'number') return null
    return { sub: raw.sub, exp: raw.exp }
  } catch {
    return null
  }
}
