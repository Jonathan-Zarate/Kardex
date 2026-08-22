import { api } from './client'
import type { AuthUser } from '@/types/api'

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),

  logout: (refreshToken: string) =>
    api.post<void>('/auth/logout', { refreshToken }),

  me: () => api.get<AuthUser>('/auth/me'),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, newPassword }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch<{ message: string }>('/auth/me/password', { currentPassword, newPassword }),

  updateProfile: (name: string) =>
    api.patch<AuthUser>('/auth/me', { name }),
}
