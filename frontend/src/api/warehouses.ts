import { api } from './client'
import type { Warehouse } from '@/types/api'

export const warehousesApi = {
  list: (isActive = true) =>
    api.get<Warehouse[]>(`/warehouses?isActive=${isActive}`),

  get: (id: string) => api.get<Warehouse>(`/warehouses/${id}`),

  create: (data: { name: string; location?: string }) =>
    api.post<Warehouse>('/warehouses', data),

  update: (id: string, data: { name?: string; location?: string | null }) =>
    api.patch<Warehouse>(`/warehouses/${id}`, data),

  deactivate: (id: string) =>
    api.patch<Warehouse>(`/warehouses/${id}/deactivate`, {}),
}
