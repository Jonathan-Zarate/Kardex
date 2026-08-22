import { describe, expect, it } from 'vitest'
import { evaluateReturn, ReturnRuleError, type ReturnRuleInput } from './inventory-rules'

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
