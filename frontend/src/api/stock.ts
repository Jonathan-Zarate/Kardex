import { api } from './client'
import type { StockItem } from '@/types/api'

export const stockApi = {
  list: (params?: { productId?: string; warehouseId?: string }) => {
    const q = new URLSearchParams()
    if (params?.productId) q.set('productId', params.productId)
    if (params?.warehouseId) q.set('warehouseId', params.warehouseId)
    return api.get<StockItem[]>(`/stock?${q}`)
  },

  byProduct: (productId: string) =>
    api.get<StockItem[]>(`/stock/${productId}`),
}
