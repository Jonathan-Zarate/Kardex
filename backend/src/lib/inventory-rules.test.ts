import { describe, expect, it } from 'vitest'
import {
  calculateExitBalance,
  evaluateReturn,
  ReturnRuleError,
  type ReturnRuleInput,
} from './inventory-rules.js'

function saleReturn(overrides: Partial<ReturnRuleInput> = {}): ReturnRuleInput {
  return {
    subtype: 'SALE_RETURN',
    companyId: 'company-1',
    productId: 'product-1',
    warehouseId: 'warehouse-1',
    quantity: 3,
    currentAvgCost: 12,
    previouslyReturnedQuantity: 2,
    original: {
      companyId: 'company-1',
      productId: 'product-1',
      warehouseId: 'warehouse-1',
      subtype: 'SALE',
      status: 'APPROVED',
      quantity: 10,
      unitCost: 8,
    },
    ...overrides,
  }
}

describe('evaluateReturn', () => {
  it('valora una devolución de venta al promedio vigente', () => {
    expect(evaluateReturn(saleReturn())).toEqual({
      unitCost: 12,
      remainingReturnableQuantity: 5,
    })
  })

  it('valora una devolución de compra al costo de la compra original', () => {
    const input = saleReturn({
      subtype: 'PURCHASE_RETURN',
      currentAvgCost: 15,
      original: { ...saleReturn().original, subtype: 'PURCHASE', unitCost: 8 },
    })

    expect(evaluateReturn(input).unitCost).toBe(8)
  })

  it('permite completar exactamente el saldo devolvible', () => {
    expect(evaluateReturn(saleReturn({ quantity: 8 })).remainingReturnableQuantity).toBe(0)
  })

  it('rechaza superar el acumulado del movimiento original', () => {
    expect(() => evaluateReturn(saleReturn({ quantity: 9 }))).toThrow(ReturnRuleError)
  })

  it.each([
    ['empresa', { companyId: 'company-2' }],
    ['producto', { productId: 'product-2' }],
    ['almacén', { warehouseId: 'warehouse-2' }],
  ])('rechaza una referencia de otra entidad: %s', (_label, originalChanges) => {
    const base = saleReturn()
    expect(() => evaluateReturn({
      ...base,
      original: { ...base.original, ...originalChanges },
    })).toThrow('misma empresa, producto y almacén')
  })

  it('rechaza una devolución asociada al subtipo equivocado', () => {
    expect(() => evaluateReturn(saleReturn({
      original: { ...saleReturn().original, subtype: 'PURCHASE' },
    }))).toThrow('no es compatible')
  })

  it('rechaza movimientos originales no aprobados', () => {
    expect(() => evaluateReturn(saleReturn({
      original: { ...saleReturn().original, status: 'PENDING' },
    }))).toThrow('no es compatible')
  })
})

describe('calculateExitBalance', () => {
  it('mantiene el promedio cuando la salida usa el costo promedio vigente', () => {
    expect(calculateExitBalance(10, 12, 4)).toEqual({
      quantity: 6,
      avgCost: 12,
      totalValue: 72,
      totalCost: 48,
    })
  })

  it('recalcula el promedio restante al devolver una compra a su costo original', () => {
    expect(calculateExitBalance(10, 12, 2, 8)).toEqual({
      quantity: 8,
      avgCost: 13,
      totalValue: 104,
      totalCost: 16,
    })
  })

  it('rechaza una salida superior al stock', () => {
    expect(() => calculateExitBalance(2, 10, 3)).toThrow('Stock insuficiente')
  })

  it('rechaza una devolución cuyo costo supera el valor del inventario', () => {
    expect(() => calculateExitBalance(2, 5, 1, 12)).toThrow('excede el valor disponible')
  })
})
