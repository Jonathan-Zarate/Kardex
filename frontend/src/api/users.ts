import { api } from './client'
import type { Role, User } from '@/types/api'

export const usersApi = {
  list: () => api.get<User[]>('/users'),

  get: (id: string) => api.get<User>(`/users/${id}`),

  create: (data: { name: string; email: string; password: string; role: Role }) =>
    api.post<User>('/users', data),

  update: (id: string, data: { name?: string; role?: Role }) =>
    api.patch<User>(`/users/${id}`, data),

  deactivate: (id: string) =>
    api.patch<User>(`/users/${id}/deactivate`, {}),

  unlock: (id: string) =>
    api.patch<User>(`/users/${id}/unlock`, {}),
}
