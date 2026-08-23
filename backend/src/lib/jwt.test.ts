import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sign } from 'hono/jwt'
import { signAccessToken, verifyAccessToken } from './jwt.js'

const TEST_SECRET = 'test-secret-with-at-least-32-characters-long'

describe('access tokens', () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = TEST_SECRET
  })

  afterEach(() => {
    delete process.env.JWT_ACCESS_SECRET
  })

  it('solo transporta la identidad y expiración del usuario', async () => {
    const token = await signAccessToken('user-1')
    const payload = await verifyAccessToken(token)

    expect(payload?.sub).toBe('user-1')
    expect(payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
    expect(payload).not.toHaveProperty('role')
    expect(payload).not.toHaveProperty('companyId')
  })

  it('rechaza tokens alterados', async () => {
    const token = await signAccessToken('user-1')
    expect(await verifyAccessToken(`${token}altered`)).toBeNull()
  })

  it('rechaza tokens firmados que no identifican a un usuario', async () => {
    const token = await sign(
      { exp: Math.floor(Date.now() / 1000) + 60 },
      TEST_SECRET,
      'HS256',
    )
    expect(await verifyAccessToken(token)).toBeNull()
  })

  it('falla explícitamente cuando el secreto no es seguro', async () => {
    process.env.JWT_ACCESS_SECRET = 'short'
    await expect(signAccessToken('user-1')).rejects.toThrow('al menos 32 caracteres')
  })
})
