import { api } from './client'
import type { KardexEntry } from '@/types/api'

export const kardexApi = {
  report: (params: {
    productId: string
    warehouseId?: string
    from?: string
    to?: string
  }) => {
    const q = new URLSearchParams({ productId: params.productId })
    if (params.warehouseId) q.set('warehouseId', params.warehouseId)
    if (params.from) q.set('from', params.from)
    if (params.to) q.set('to', params.to)
    return api.get<KardexEntry[]>(`/kardex?${q}`)
  },
}
