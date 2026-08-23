import { db } from '../db.js'
import { auditLogs } from '@kardex/database'

interface AuditParams {
  companyId: string
  userId: string
  action: string
  entity: string
  entityId?: string
  oldValue?: unknown
  newValue?: unknown
  ip?: string
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      companyId: params.companyId,
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      oldValue: (params.oldValue ?? null) as Record<string, unknown> | null,
      newValue: (params.newValue ?? null) as Record<string, unknown> | null,
      ip: params.ip ?? null,
    })
  } catch (err) {
    // Los fallos de auditoría no deben interrumpir el flujo principal
    console.error('[AUDIT] Error al registrar:', err)
  }
}
