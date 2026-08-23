import { describe, expect, it } from 'vitest'
import { isUniqueViolation } from './db-errors.js'

describe('isUniqueViolation', () => {
  it('detecta una violación única directa', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true)
  })

  it('detecta una violación única anidada como causa', () => {
    expect(isUniqueViolation({ cause: { code: '23505' } })).toBe(true)
  })

  it('rechaza errores ajenos a unicidad', () => {
    expect(isUniqueViolation({ code: '23503' })).toBe(false)
    expect(isUniqueViolation(new Error('fallo'))).toBe(false)
  })
})
