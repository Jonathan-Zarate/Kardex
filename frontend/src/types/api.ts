export type Role = 'ADMIN' | 'SUPERVISOR' | 'WAREHOUSE'
export type UOM = 'UND' | 'KG' | 'LT' | 'MT' | 'CJA' | 'PAQ'
export type MovementType = 'ENTRY' | 'EXIT' | 'TRANSFER'
export type MovementSubtype =
  | 'PURCHASE' | 'SALE_RETURN' | 'POSITIVE_ADJUSTMENT'
  | 'SALE' | 'PURCHASE_RETURN' | 'NEGATIVE_ADJUSTMENT'
  | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'VOID'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  companyId: string
}

export interface User {
  id: string
  companyId: string
  name: string
  email: string
  role: Role
  isActive: boolean
  lockedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Company {
  id: string
  name: string
  ruc: string
  address: string | null
  logoUrl: string | null
  currency: string
  timezone: string
  decimalSeparator: string
  dateFormat: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  companyId: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Supplier {
  id: string
  companyId: string
  name: string
  ruc: string | null
  phone: string | null
  email: string | null
  address: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  companyId: string
  categoryId: string | null
  code: string
  name: string
  description: string | null
  unitOfMeasure: UOM
  minStock: string
  salePrice: string | null
  imageUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  categoryName?: string | null
}

export type BadgeVariant = 'green' | 'red' | 'blue' | 'yellow' | 'gray' | 'purple'

export interface Warehouse {
  id: string
  companyId: string
  name: string
  location: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface StockItem {
  id: string
  productId: string
  warehouseId: string
  quantity: string
  avgCost: string
  updatedAt: string
  productCode: string
  productName: string
  productUnit: UOM
  productMinStock: string
  warehouseName: string
}

export interface Movement {
  id: string
  type: MovementType
  subtype: MovementSubtype
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'VOIDED'
  rejectionComment?: string | null
  quantity: string
  unitCost: string
  totalCost: string
  reference: string | null
  notes: string | null
  supplierId: string | null
  referenceMovementId: string | null
  createdAt: string
  productId: string
  productCode: string
  productName: string
  productUnit: UOM
  warehouseId: string
  warehouseName: string
}

export interface AuditLog {
  id: string
  action: string
  entity: string
  entityId: string | null
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  ip: string | null
  createdAt: string
  userId: string
  userName: string | null
  userEmail: string | null
}

export interface AuditLogPage {
  data: AuditLog[]
  total: number
  limit: number
  offset: number
}

export interface KardexEntry {
  id: string
  date: string
  movementId: string
  movementType: MovementType
  movementSubtype: MovementSubtype
  movementReference: string | null
  inQty: string
  inUnitCost: string
  inTotalCost: string
  outQty: string
  outUnitCost: string
  outTotalCost: string
  balanceQty: string
  balanceAvgCost: string
  balanceTotalValue: string
  productName: string
  productCode: string
  productUnit: UOM
  warehouseName: string
}
