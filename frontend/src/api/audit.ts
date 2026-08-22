import { api } from './client'
import type { AuditLog, AuditLogPage } from '@/types/api'

export interface AuditListParams {
  entity?: string
  action?: string
  userId?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export const auditApi = {
  list: (params: AuditListParams = {}): Promise<AuditLogPage> => {
    const q = new URLSearchParams()
    if (params.entity) q.set('entity', params.entity)
    if (params.action) q.set('action', params.action)
    if (params.userId) q.set('userId', params.userId)
    if (params.from) q.set('from', params.from)
    if (params.to) q.set('to', params.to)
    if (params.limit !== undefined) q.set('limit', String(params.limit))
    if (params.offset !== undefined) q.set('offset', String(params.offset))
    return api.get<AuditLogPage>(`/audit-logs?${q}`)
  },

  entities: (): Promise<string[]> => api.get<string[]>('/audit-logs/entities'),
}

export type { AuditLog }
