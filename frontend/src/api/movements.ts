import { api } from './client'
import type { Movement, MovementType } from '@/types/api'

export interface EntryInput {
  type: 'ENTRY'
  subtype: 'PURCHASE' | 'SALE_RETURN' | 'POSITIVE_ADJUSTMENT'
  productId: string
  warehouseId: string
  quantity: number
  unitCost?: number
  referenceMovementId?: string
  reference?: string
  notes?: string
  supplierId?: string
}

export interface ExitInput {
  type: 'EXIT'
  subtype: 'SALE' | 'PURCHASE_RETURN' | 'NEGATIVE_ADJUSTMENT'
  productId: string
  warehouseId: string
  quantity: number
  referenceMovementId?: string
  reference?: string
  notes?: string
}

export interface TransferInput {
  type: 'TRANSFER'
  productId: string
  sourceWarehouseId: string
  targetWarehouseId: string
  quantity: number
  notes?: string
}

export type MovementInput = EntryInput | ExitInput | TransferInput

interface MovementsListParams {
  productId?: string
  warehouseId?: string
  type?: MovementType
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'VOIDED'
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface MovementsPage {
  data: Movement[]
  page: number
  limit: number
}

export const movementsApi = {
  list: (params?: MovementsListParams) => {
    const q = new URLSearchParams()
    if (params?.productId) q.set('productId', params.productId)
    if (params?.warehouseId) q.set('warehouseId', params.warehouseId)
    if (params?.type) q.set('type', params.type)
    if (params?.status) q.set('status', params.status)
    if (params?.from) q.set('from', params.from)
    if (params?.to) q.set('to', params.to)
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    return api.get<MovementsPage>(`/movements?${q}`)
  },

  get: (id: string) => api.get<Movement>(`/movements/${id}`),

  create: (data: MovementInput) =>
    api.post<{ movements: Movement[] }>('/movements', data),

  approve: (id: string) =>
    api.patch<{ ok: boolean }>(`/movements/${id}/approve`, {}),

  reject: (id: string, comment: string) =>
    api.patch<{ ok: boolean }>(`/movements/${id}/reject`, { comment }),

  void: (id: string, notes?: string) =>
    api.post<{ ok: boolean }>(`/movements/${id}/void`, { notes }),
}
