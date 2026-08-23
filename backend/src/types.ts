export interface AccessTokenPayload {
  sub: string
  exp: number
}

export interface AuthenticatedUser {
  sub: string
  companyId: string
  role: 'ADMIN' | 'SUPERVISOR' | 'WAREHOUSE'
  email: string
}

export type AppEnv = {
  Variables: {
    user: AuthenticatedUser
  }
}
