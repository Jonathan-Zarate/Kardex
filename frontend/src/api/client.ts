import { useAuthStore } from '@/store/auth'

const BASE = '/api'

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken, setAccessToken, logout } = useAuthStore.getState()
  if (!refreshToken) return false
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) { logout(); return false }
    const data = await res.json() as { accessToken: string; refreshToken: string }
    setAccessToken(data.accessToken, data.refreshToken)
    return true
  } catch {
    logout()
    return false
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { accessToken } = useAuthStore.getState()

  const headers = new Headers(init.headers as HeadersInit)
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  let res = await fetch(`${BASE}${path}`, { ...init, headers })

  if (res.status === 401 && accessToken) {
    const ok = await refreshAccessToken()
    if (!ok) throw new ApiError('Sesión expirada', 401)
    const { accessToken: newToken } = useAuthStore.getState()
    headers.set('Authorization', `Bearer ${newToken}`)
    res = await fetch(`${BASE}${path}`, { ...init, headers })
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new ApiError(body.error ?? 'Error del servidor', res.status)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  public readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
