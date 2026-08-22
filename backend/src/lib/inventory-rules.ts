export type ReturnSubtype = 'SALE_RETURN' | 'PURCHASE_RETURN'

export interface OriginalMovementForReturn {
  companyId: string
  productId: string
  warehouseId: string
  subtype: string
  status: string
  quantity: number
  unitCost: number
}

export interface ReturnRuleInput {
  subtype: ReturnSubtype
  companyId: string
  productId: string
  warehouseId: string
  quantity: number
  currentAvgCost: number
  previouslyReturnedQuantity: number
  original: OriginalMovementForReturn
}

export interface ReturnRuleResult {
  unitCost: number
  remainingReturnableQuantity: number
}

export class ReturnRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReturnRuleError'
  }
}

export interface ExitBalance {
  quantity: number
  avgCost: number
  totalValue: number
  totalCost: number
}

export function calculateExitBalance(
  currentQuantity: number,
  currentAvgCost: number,
  exitQuantity: number,
  exitUnitCost = currentAvgCost,
): ExitBalance {
  if (exitQuantity > currentQuantity) {
    throw new ReturnRuleError(`Stock insuficiente. Disponible: ${currentQuantity}`)
  }

  const quantity = currentQuantity - exitQuantity
  const totalCost = exitQuantity * exitUnitCost
  const remainingValue = currentQuantity * currentAvgCost - totalCost

  if (remainingValue < -0.0001) {
    throw new ReturnRuleError('La devolución excede el valor disponible del inventario')
  }

  const totalValue = Math.max(0, remainingValue)
  return {
    quantity,
    avgCost: quantity > 0 ? totalValue / quantity : 0,
    totalValue,
    totalCost,
  }
}

const ORIGINAL_SUBTYPE: Record<ReturnSubtype, 'SALE' | 'PURCHASE'> = {
  SALE_RETURN: 'SALE',
  PURCHASE_RETURN: 'PURCHASE',
}

export function evaluateReturn(input: ReturnRuleInput): ReturnRuleResult {
  const { original } = input

  if (original.status !== 'APPROVED' || original.subtype !== ORIGINAL_SUBTYPE[input.subtype]) {
    throw new ReturnRuleError('El movimiento original no es compatible con la devolución')
  }

  if (
    original.companyId !== input.companyId
    || original.productId !== input.productId
    || original.warehouseId !== input.warehouseId
  ) {
    throw new ReturnRuleError('La devolución debe pertenecer a la misma empresa, producto y almacén')
  }

  const remaining = original.quantity - input.previouslyReturnedQuantity
  if (input.quantity > remaining) {
    throw new ReturnRuleError(`La cantidad excede el saldo devolvible. Disponible: ${remaining}`)
  }

  return {
    unitCost: input.subtype === 'SALE_RETURN' ? input.currentAvgCost : original.unitCost,
    remainingReturnableQuantity: remaining - input.quantity,
  }
}
