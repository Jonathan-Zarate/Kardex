import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { inventoryMovements, kardexEntries, stockBalances } from '@kardex/database'

export class InventoryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InventoryError'
  }
}

export interface EntryInput {
  type: 'ENTRY'
  subtype: 'PURCHASE' | 'SALE_RETURN' | 'POSITIVE_ADJUSTMENT'
  companyId: string
  productId: string
  warehouseId: string
  quantity: number
  unitCost: number
  reference?: string | null
  notes?: string | null
  supplierId?: string | null
  createdBy: string
}

export interface ExitInput {
  type: 'EXIT'
  subtype: 'SALE' | 'PURCHASE_RETURN' | 'NEGATIVE_ADJUSTMENT'
  companyId: string
  productId: string
  warehouseId: string
  quantity: number
  reference?: string | null
  notes?: string | null
  createdBy: string
}

export interface TransferInput {
  type: 'TRANSFER'
  companyId: string
  productId: string
  sourceWarehouseId: string
  targetWarehouseId: string
  quantity: number
  notes?: string | null
  createdBy: string
}

export type MovementInput = EntryInput | ExitInput | TransferInput

function newAvgCost(currentQty: number, currentAvg: number, inQty: number, inCost: number): number {
  const total = currentQty + inQty
  return total > 0 ? (currentQty * currentAvg + inQty * inCost) / total : inCost
}

type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0]
type MovementInsert = typeof inventoryMovements.$inferInsert

// Creates movement and immediately applies stock + kardex (for auto-approved movements).
async function createAndApply(tx: TxClient, values: MovementInsert, now: Date) {
  const [movement] = await tx.insert(inventoryMovements).values(values).returning()

  const { companyId, productId, warehouseId } = movement
  const qty = parseFloat(movement.quantity)

  const [row] = await tx.select().from(stockBalances).where(
    and(
      eq(stockBalances.companyId, companyId),
      eq(stockBalances.productId, productId),
      eq(stockBalances.warehouseId, warehouseId),
    ),
  ).limit(1)

  const currentQty = parseFloat(row?.quantity ?? '0')
  const currentAvg = parseFloat(row?.avgCost ?? '0')

  if (movement.type === 'ENTRY') {
    const cost = parseFloat(movement.unitCost)
    const newQty = currentQty + qty
    const newAvg = newAvgCost(currentQty, currentAvg, qty, cost)
    const totalCost = qty * cost

    if (row) {
      await tx.update(stockBalances)
        .set({ quantity: newQty.toFixed(4), avgCost: newAvg.toFixed(4), updatedAt: now })
        .where(eq(stockBalances.id, row.id))
    } else {
      await tx.insert(stockBalances).values({
        companyId, productId, warehouseId,
        quantity: newQty.toFixed(4),
        avgCost: newAvg.toFixed(4),
      })
    }

    await tx.insert(kardexEntries).values({
      movementId: movement.id,
      companyId, productId, warehouseId,
      date: now,
      inQty: qty.toFixed(4),
      inUnitCost: cost.toFixed(4),
      inTotalCost: totalCost.toFixed(4),
      balanceQty: newQty.toFixed(4),
      balanceAvgCost: newAvg.toFixed(4),
      balanceTotalValue: (newQty * newAvg).toFixed(4),
    })
  } else {
    // EXIT
    if (currentQty < qty) {
      throw new InventoryError(`Stock insuficiente. Disponible: ${currentQty}`)
    }

    const newQty = currentQty - qty
    const totalCost = qty * currentAvg

    if (row) {
      await tx.update(stockBalances)
        .set({ quantity: newQty.toFixed(4), updatedAt: now })
        .where(eq(stockBalances.id, row.id))
    }

    // Update movement with actual cost (EXIT cost = avg at moment of operation)
    await tx.update(inventoryMovements)
      .set({ unitCost: currentAvg.toFixed(4), totalCost: totalCost.toFixed(4) })
      .where(eq(inventoryMovements.id, movement.id))

    await tx.insert(kardexEntries).values({
      movementId: movement.id,
      companyId, productId, warehouseId,
      date: now,
      outQty: qty.toFixed(4),
      outUnitCost: currentAvg.toFixed(4),
      outTotalCost: totalCost.toFixed(4),
      balanceQty: newQty.toFixed(4),
      balanceAvgCost: currentAvg.toFixed(4),
      balanceTotalValue: (newQty * currentAvg).toFixed(4),
    })
  }

  return movement
}

export async function processMovement(input: MovementInput) {
  return db.transaction(async (tx) => {
    const now = new Date()

    /* ── TRANSFER ────────────────────────────────────── */
    if (input.type === 'TRANSFER') {
      const { companyId, productId, sourceWarehouseId, targetWarehouseId, quantity, notes, createdBy } = input

      if (sourceWarehouseId === targetWarehouseId) {
        throw new InventoryError('El almacén origen y destino no pueden ser el mismo')
      }

      const [srcRow] = await tx.select().from(stockBalances).where(
        and(
          eq(stockBalances.companyId, companyId),
          eq(stockBalances.productId, productId),
          eq(stockBalances.warehouseId, sourceWarehouseId),
        ),
      ).limit(1)

      const srcQty = parseFloat(srcRow?.quantity ?? '0')
      const srcAvg = parseFloat(srcRow?.avgCost ?? '0')

      if (srcQty < quantity) {
        throw new InventoryError(`Stock insuficiente en almacén origen. Disponible: ${srcQty}`)
      }

      const [dstRow] = await tx.select().from(stockBalances).where(
        and(
          eq(stockBalances.companyId, companyId),
          eq(stockBalances.productId, productId),
          eq(stockBalances.warehouseId, targetWarehouseId),
        ),
      ).limit(1)

      const dstQty = parseFloat(dstRow?.quantity ?? '0')
      const dstAvg = parseFloat(dstRow?.avgCost ?? '0')

      const newSrcQty = srcQty - quantity
      const newDstQty = dstQty + quantity
      const newDstAvg = newAvgCost(dstQty, dstAvg, quantity, srcAvg)
      const totalCost = quantity * srcAvg

      const [outMov] = await tx.insert(inventoryMovements).values({
        companyId, productId,
        warehouseId: sourceWarehouseId,
        type: 'TRANSFER',
        subtype: 'TRANSFER_OUT',
        status: 'APPROVED',
        quantity: quantity.toFixed(4),
        unitCost: srcAvg.toFixed(4),
        totalCost: totalCost.toFixed(4),
        notes: notes ?? null,
        createdBy,
        approvedBy: createdBy,
        approvedAt: now,
      }).returning()

      const [inMov] = await tx.insert(inventoryMovements).values({
        companyId, productId,
        warehouseId: targetWarehouseId,
        type: 'TRANSFER',
        subtype: 'TRANSFER_IN',
        status: 'APPROVED',
        quantity: quantity.toFixed(4),
        unitCost: srcAvg.toFixed(4),
        totalCost: totalCost.toFixed(4),
        notes: notes ?? null,
        referenceMovementId: outMov.id,
        createdBy,
        approvedBy: createdBy,
        approvedAt: now,
      }).returning()

      if (srcRow) {
        await tx.update(stockBalances)
          .set({ quantity: newSrcQty.toFixed(4), updatedAt: now })
          .where(eq(stockBalances.id, srcRow.id))
      } else {
        await tx.insert(stockBalances).values({
          companyId, productId, warehouseId: sourceWarehouseId,
          quantity: newSrcQty.toFixed(4),
          avgCost: srcAvg.toFixed(4),
        })
      }

      if (dstRow) {
        await tx.update(stockBalances)
          .set({ quantity: newDstQty.toFixed(4), avgCost: newDstAvg.toFixed(4), updatedAt: now })
          .where(eq(stockBalances.id, dstRow.id))
      } else {
        await tx.insert(stockBalances).values({
          companyId, productId, warehouseId: targetWarehouseId,
          quantity: newDstQty.toFixed(4),
          avgCost: newDstAvg.toFixed(4),
        })
      }

      await tx.insert(kardexEntries).values([
        {
          movementId: outMov.id,
          companyId, productId, warehouseId: sourceWarehouseId,
          date: now,
          outQty: quantity.toFixed(4),
          outUnitCost: srcAvg.toFixed(4),
          outTotalCost: totalCost.toFixed(4),
          balanceQty: newSrcQty.toFixed(4),
          balanceAvgCost: srcAvg.toFixed(4),
          balanceTotalValue: (newSrcQty * srcAvg).toFixed(4),
        },
        {
          movementId: inMov.id,
          companyId, productId, warehouseId: targetWarehouseId,
          date: now,
          inQty: quantity.toFixed(4),
          inUnitCost: srcAvg.toFixed(4),
          inTotalCost: totalCost.toFixed(4),
          balanceQty: newDstQty.toFixed(4),
          balanceAvgCost: newDstAvg.toFixed(4),
          balanceTotalValue: (newDstQty * newDstAvg).toFixed(4),
        },
      ])

      return { movements: [outMov, inMov] }
    }

    /* ── ENTRY ───────────────────────────────────────── */
    if (input.type === 'ENTRY') {
      const { companyId, productId, warehouseId, quantity, unitCost, subtype, reference, notes, supplierId, createdBy } = input

      // Adjustments require SUPERVISOR approval — create as PENDING without touching stock
      if (subtype === 'POSITIVE_ADJUSTMENT') {
        const [movement] = await tx.insert(inventoryMovements).values({
          companyId, productId, warehouseId,
          type: 'ENTRY',
          subtype: 'POSITIVE_ADJUSTMENT',
          status: 'PENDING',
          quantity: quantity.toFixed(4),
          unitCost: unitCost.toFixed(4),
          totalCost: (quantity * unitCost).toFixed(4),
          reference: reference ?? null,
          notes: notes ?? null,
          supplierId: supplierId ?? null,
          createdBy,
        }).returning()
        return { movements: [movement] }
      }

      const movement = await createAndApply(tx, {
        companyId, productId, warehouseId,
        type: 'ENTRY',
        subtype,
        status: 'APPROVED',
        quantity: quantity.toFixed(4),
        unitCost: unitCost.toFixed(4),
        totalCost: (quantity * unitCost).toFixed(4),
        reference: reference ?? null,
        notes: notes ?? null,
        supplierId: supplierId ?? null,
        createdBy,
        approvedBy: createdBy,
        approvedAt: now,
      }, now)

      return { movements: [movement] }
    }

    /* ── EXIT ────────────────────────────────────────── */
    const { companyId, productId, warehouseId, quantity, subtype, reference, notes, createdBy } = input

    // Negative adjustments require SUPERVISOR approval — create as PENDING
    if (subtype === 'NEGATIVE_ADJUSTMENT') {
      const [movement] = await tx.insert(inventoryMovements).values({
        companyId, productId, warehouseId,
        type: 'EXIT',
        subtype: 'NEGATIVE_ADJUSTMENT',
        status: 'PENDING',
        quantity: quantity.toFixed(4),
        unitCost: '0',
        totalCost: '0',
        reference: reference ?? null,
        notes: notes ?? null,
        createdBy,
      }).returning()
      return { movements: [movement] }
    }

    const movement = await createAndApply(tx, {
      companyId, productId, warehouseId,
      type: 'EXIT',
      subtype,
      status: 'APPROVED',
      quantity: quantity.toFixed(4),
      unitCost: '0',
      totalCost: '0',
      reference: reference ?? null,
      notes: notes ?? null,
      createdBy,
      approvedBy: createdBy,
      approvedAt: now,
    }, now)

    return { movements: [movement] }
  })
}

/* ── APPROVE ADJUSTMENT ──────────────────────────────── */

export async function approveAdjustment(movementId: string, companyId: string, approvedBy: string) {
  return db.transaction(async (tx) => {
    const now = new Date()

    const [movement] = await tx.select().from(inventoryMovements)
      .where(and(eq(inventoryMovements.id, movementId), eq(inventoryMovements.companyId, companyId)))
      .limit(1)

    if (!movement) throw new InventoryError('Movimiento no encontrado')
    if (movement.status !== 'PENDING') throw new InventoryError('El movimiento no está pendiente de aprobación')
    if (!['POSITIVE_ADJUSTMENT', 'NEGATIVE_ADJUSTMENT'].includes(movement.subtype)) {
      throw new InventoryError('Solo se pueden aprobar ajustes de inventario')
    }

    const { productId, warehouseId } = movement
    const qty = parseFloat(movement.quantity)

    const [stockRow] = await tx.select().from(stockBalances).where(
      and(
        eq(stockBalances.companyId, companyId),
        eq(stockBalances.productId, productId),
        eq(stockBalances.warehouseId, warehouseId),
      ),
    ).limit(1)

    const currentQty = parseFloat(stockRow?.quantity ?? '0')
    const currentAvg = parseFloat(stockRow?.avgCost ?? '0')

    if (movement.type === 'ENTRY') {
      // POSITIVE_ADJUSTMENT: use unitCost provided by WAREHOUSE
      const cost = parseFloat(movement.unitCost)
      const newQty = currentQty + qty
      const newAvg = newAvgCost(currentQty, currentAvg, qty, cost)
      const totalCost = qty * cost

      if (stockRow) {
        await tx.update(stockBalances)
          .set({ quantity: newQty.toFixed(4), avgCost: newAvg.toFixed(4), updatedAt: now })
          .where(eq(stockBalances.id, stockRow.id))
      } else {
        await tx.insert(stockBalances).values({
          companyId, productId, warehouseId,
          quantity: newQty.toFixed(4),
          avgCost: newAvg.toFixed(4),
        })
      }

      await tx.insert(kardexEntries).values({
        movementId: movement.id,
        companyId, productId, warehouseId,
        date: now,
        inQty: qty.toFixed(4),
        inUnitCost: cost.toFixed(4),
        inTotalCost: totalCost.toFixed(4),
        balanceQty: newQty.toFixed(4),
        balanceAvgCost: newAvg.toFixed(4),
        balanceTotalValue: (newQty * newAvg).toFixed(4),
      })
    } else {
      // NEGATIVE_ADJUSTMENT: cost determined at approval time (current avg)
      if (currentQty < qty) {
        throw new InventoryError(`Stock insuficiente para aprobar el ajuste. Disponible: ${currentQty}`)
      }

      const totalCost = qty * currentAvg
      const newQty = currentQty - qty

      // Update movement with actual cost now that we know it
      await tx.update(inventoryMovements)
        .set({ unitCost: currentAvg.toFixed(4), totalCost: totalCost.toFixed(4) })
        .where(eq(inventoryMovements.id, movementId))

      if (stockRow) {
        await tx.update(stockBalances)
          .set({ quantity: newQty.toFixed(4), updatedAt: now })
          .where(eq(stockBalances.id, stockRow.id))
      }

      await tx.insert(kardexEntries).values({
        movementId: movement.id,
        companyId, productId, warehouseId,
        date: now,
        outQty: qty.toFixed(4),
        outUnitCost: currentAvg.toFixed(4),
        outTotalCost: totalCost.toFixed(4),
        balanceQty: newQty.toFixed(4),
        balanceAvgCost: currentAvg.toFixed(4),
        balanceTotalValue: (newQty * currentAvg).toFixed(4),
      })
    }

    await tx.update(inventoryMovements)
      .set({ status: 'APPROVED', approvedBy, approvedAt: now })
      .where(eq(inventoryMovements.id, movementId))
  })
}

/* ── REJECT ADJUSTMENT ───────────────────────────────── */

export async function rejectAdjustment(
  movementId: string,
  companyId: string,
  rejectedBy: string,
  rejectionComment: string,
) {
  return db.transaction(async (tx) => {
    const [movement] = await tx.select().from(inventoryMovements)
      .where(and(eq(inventoryMovements.id, movementId), eq(inventoryMovements.companyId, companyId)))
      .limit(1)

    if (!movement) throw new InventoryError('Movimiento no encontrado')
    if (movement.status !== 'PENDING') throw new InventoryError('El movimiento no está pendiente')
    if (!['POSITIVE_ADJUSTMENT', 'NEGATIVE_ADJUSTMENT'].includes(movement.subtype)) {
      throw new InventoryError('Solo se pueden rechazar ajustes de inventario')
    }

    await tx.update(inventoryMovements)
      .set({
        status: 'REJECTED',
        approvedBy: rejectedBy,
        approvedAt: new Date(),
        rejectionComment,
      })
      .where(eq(inventoryMovements.id, movementId))
  })
}

/* ── VOID MOVEMENT (contraasiento) ──────────────────── */

const VOIDABLE_SUBTYPES = new Set(['PURCHASE', 'SALE_RETURN', 'SALE', 'PURCHASE_RETURN', 'POSITIVE_ADJUSTMENT', 'NEGATIVE_ADJUSTMENT'])

export async function voidMovement(movementId: string, companyId: string, voidedBy: string, notes?: string) {
  return db.transaction(async (tx) => {
    const now = new Date()

    const [movement] = await tx.select().from(inventoryMovements)
      .where(and(eq(inventoryMovements.id, movementId), eq(inventoryMovements.companyId, companyId)))
      .limit(1)

    if (!movement) throw new InventoryError('Movimiento no encontrado')
    if (movement.status !== 'APPROVED') throw new InventoryError('Solo se pueden anular movimientos aprobados')
    if (!VOIDABLE_SUBTYPES.has(movement.subtype)) {
      throw new InventoryError('Las transferencias y anulaciones previas no pueden anularse')
    }

    const { productId, warehouseId } = movement
    const qty = parseFloat(movement.quantity)

    const [stockRow] = await tx.select().from(stockBalances).where(
      and(
        eq(stockBalances.companyId, companyId),
        eq(stockBalances.productId, productId),
        eq(stockBalances.warehouseId, warehouseId),
      ),
    ).limit(1)

    const currentQty = parseFloat(stockRow?.quantity ?? '0')
    const currentAvg = parseFloat(stockRow?.avgCost ?? '0')

    if (movement.type === 'ENTRY') {
      // Contraasiento: EXIT at current avg cost
      if (currentQty < qty) {
        throw new InventoryError(`No se puede anular: stock insuficiente. Disponible: ${currentQty}`)
      }

      const newQty = currentQty - qty
      const totalCost = qty * currentAvg

      const [voidMov] = await tx.insert(inventoryMovements).values({
        companyId, productId, warehouseId,
        type: 'EXIT',
        subtype: 'VOID',
        status: 'APPROVED',
        quantity: qty.toFixed(4),
        unitCost: currentAvg.toFixed(4),
        totalCost: totalCost.toFixed(4),
        notes: notes ?? null,
        referenceMovementId: movement.id,
        createdBy: voidedBy,
        approvedBy: voidedBy,
        approvedAt: now,
      }).returning()

      if (stockRow) {
        await tx.update(stockBalances)
          .set({ quantity: newQty.toFixed(4), updatedAt: now })
          .where(eq(stockBalances.id, stockRow.id))
      }

      await tx.insert(kardexEntries).values({
        movementId: voidMov.id,
        companyId, productId, warehouseId,
        date: now,
        outQty: qty.toFixed(4),
        outUnitCost: currentAvg.toFixed(4),
        outTotalCost: totalCost.toFixed(4),
        balanceQty: newQty.toFixed(4),
        balanceAvgCost: currentAvg.toFixed(4),
        balanceTotalValue: (newQty * currentAvg).toFixed(4),
      })
    } else {
      // EXIT contraasiento: ENTRY at current avg cost
      const newQty = currentQty + qty
      const newAvg = newAvgCost(currentQty, currentAvg, qty, currentAvg)
      const totalCost = qty * currentAvg

      const [voidMov] = await tx.insert(inventoryMovements).values({
        companyId, productId, warehouseId,
        type: 'ENTRY',
        subtype: 'VOID',
        status: 'APPROVED',
        quantity: qty.toFixed(4),
        unitCost: currentAvg.toFixed(4),
        totalCost: totalCost.toFixed(4),
        notes: notes ?? null,
        referenceMovementId: movement.id,
        createdBy: voidedBy,
        approvedBy: voidedBy,
        approvedAt: now,
      }).returning()

      if (stockRow) {
        await tx.update(stockBalances)
          .set({ quantity: newQty.toFixed(4), avgCost: newAvg.toFixed(4), updatedAt: now })
          .where(eq(stockBalances.id, stockRow.id))
      } else {
        await tx.insert(stockBalances).values({
          companyId, productId, warehouseId,
          quantity: newQty.toFixed(4),
          avgCost: newAvg.toFixed(4),
        })
      }

      await tx.insert(kardexEntries).values({
        movementId: voidMov.id,
        companyId, productId, warehouseId,
        date: now,
        inQty: qty.toFixed(4),
        inUnitCost: currentAvg.toFixed(4),
        inTotalCost: totalCost.toFixed(4),
        balanceQty: newQty.toFixed(4),
        balanceAvgCost: newAvg.toFixed(4),
        balanceTotalValue: (newQty * newAvg).toFixed(4),
      })
    }

    // Mark original as VOIDED
    await tx.update(inventoryMovements)
      .set({ status: 'VOIDED' })
      .where(eq(inventoryMovements.id, movementId))
  })
}
