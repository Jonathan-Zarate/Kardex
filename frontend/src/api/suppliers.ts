import { api } from './client'
import type { Supplier } from '@/types/api'

export interface SupplierInput {
  name: string
  ruc?: string
  phone?: string
  email?: string
  address?: string
}

export const suppliersApi = {
  list: (isActive = true) =>
    api.get<Supplier[]>(`/suppliers?isActive=${isActive}`),

  get: (id: string) => api.get<Supplier>(`/suppliers/${id}`),

  create: (data: SupplierInput) => api.post<Supplier>('/suppliers', data),

  update: (id: string, data: Partial<SupplierInput>) =>
    api.patch<Supplier>(`/suppliers/${id}`, data),

  deactivate: (id: string) =>
    api.patch<Supplier>(`/suppliers/${id}/deactivate`, {}),
}
