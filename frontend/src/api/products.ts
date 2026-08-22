import { api } from './client'
import type { Product, UOM } from '@/types/api'

export interface ProductInput {
  code: string
  name: string
  description?: string
  unitOfMeasure: UOM
  categoryId?: string
  minStock?: number
  salePrice?: number
}

export const productsApi = {
  list: (params?: { categoryId?: string; isActive?: boolean }) => {
    const q = new URLSearchParams()
    if (params?.categoryId) q.set('categoryId', params.categoryId)
    if (params?.isActive !== undefined) q.set('isActive', String(params.isActive))
    else q.set('isActive', 'true')
    return api.get<Product[]>(`/products?${q}`)
  },

  get: (id: string) => api.get<Product>(`/products/${id}`),

  create: (data: ProductInput) => api.post<Product>('/products', data),

  update: (id: string, data: Partial<ProductInput>) =>
    api.patch<Product>(`/products/${id}`, data),

  deactivate: (id: string) =>
    api.patch<Product>(`/products/${id}/deactivate`, {}),
}
