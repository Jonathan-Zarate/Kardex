export interface JWTPayload {
  sub: string
  companyId: string
  role: 'ADMIN' | 'SUPERVISOR' | 'WAREHOUSE'
  email: string
  exp: number
}

export type AppEnv = {
  Variables: {
    user: JWTPayload
  }
}
