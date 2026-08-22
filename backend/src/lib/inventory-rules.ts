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
