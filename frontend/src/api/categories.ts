import { api } from './client'
import type { Category } from '@/types/api'

export const categoriesApi = {
  list: (isActive = true) =>
    api.get<Category[]>(`/categories?isActive=${isActive}`),

  get: (id: string) => api.get<Category>(`/categories/${id}`),

  create: (data: { name: string; description?: string }) =>
    api.post<Category>('/categories', data),

  update: (id: string, data: { name?: string; description?: string | null }) =>
    api.patch<Category>(`/categories/${id}`, data),

  deactivate: (id: string) =>
    api.patch<Category>(`/categories/${id}/deactivate`, {}),
}
