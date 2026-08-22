import { pgEnum } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'SUPERVISOR', 'WAREHOUSE'])

export const unitOfMeasureEnum = pgEnum('unit_of_measure', ['UND', 'KG', 'LT', 'MT', 'CJA', 'PAQ'])

export const movementTypeEnum = pgEnum('movement_type', ['ENTRY', 'EXIT', 'TRANSFER'])

export const movementSubtypeEnum = pgEnum('movement_subtype', [
  'PURCHASE',
  'SALE_RETURN',
  'POSITIVE_ADJUSTMENT',
  'SALE',
  'PURCHASE_RETURN',
  'NEGATIVE_ADJUSTMENT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'VOID',
])

export const movementStatusEnum = pgEnum('movement_status', ['PENDING', 'APPROVED', 'REJECTED', 'VOIDED'])
