import { api } from './client'
import type { MovementType, MovementSubtype } from '@/types/api'

export interface DashboardMovement {
  id: string
  type: MovementType
  subtype: MovementSubtype
  status: string
  quantity: string
  unitCost: string
  totalCost: string
  createdAt: string
  productName: string
  productCode: string
  warehouseName: string
}

export interface DashboardMetrics {
  totalProducts: number
  totalInventoryValue: number
  lowStockCount: number
  recentMovements: DashboardMovement[]
  topProducts: { id: string; name: string; code: string; movement_count: number }[]
  inventoryTrend: { day: string; inValue: number; outValue: number }[]
}

export const dashboardApi = {
  metrics: () => api.get<DashboardMetrics>('/dashboard/metrics'),
}
