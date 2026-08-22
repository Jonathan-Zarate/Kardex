import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { movementsApi } from '@/api/movements'
import { useAuthStore } from '@/store/auth'
import type { MovementType } from '@/types/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'

const TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'ENTRY', label: 'Entrada' },
  { value: 'EXIT', label: 'Salida' },
  { value: 'TRANSFER', label: 'Transferencia' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'APPROVED', label: 'Aprobados' },
  { value: 'REJECTED', label: 'Rechazados' },
  { value: 'VOIDED', label: 'Anulados' },
]

const TYPE_LABEL: Record<string, string> = {
  ENTRY: 'Entrada', EXIT: 'Salida', TRANSFER: 'Transferencia',
}

const SUBTYPE_LABEL: Record<string, string> = {
  PURCHASE: 'Compra',
  SALE_RETURN: 'Dev. Venta',
  POSITIVE_ADJUSTMENT: 'Ajuste +',
  SALE: 'Venta',
  PURCHASE_RETURN: 'Dev. Compra',
  NEGATIVE_ADJUSTMENT: 'Ajuste −',
  TRANSFER_IN: 'Entrada Transf.',
  TRANSFER_OUT: 'Salida Transf.',
  VOID: 'Anulación',
}

const TYPE_COLOR: Record<string, string> = {
  ENTRY: 'text-green-600',
  EXIT: 'text-red-600',
  TRANSFER: 'text-blue-600',
}

const ADJUSTMENT_SUBTYPES = new Set(['POSITIVE_ADJUSTMENT', 'NEGATIVE_ADJUSTMENT'])
const VOIDABLE_SUBTYPES = new Set([
  'PURCHASE', 'SALE_RETURN', 'SALE', 'PURCHASE_RETURN',
  'POSITIVE_ADJUSTMENT', 'NEGATIVE_ADJUSTMENT',
])

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'VOIDED' | ''

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: 'yellow' | 'green' | 'red' | 'gray'; label: string }> = {
    PENDING:  { variant: 'yellow', label: 'Pendiente' },
    APPROVED: { variant: 'green',  label: 'Aprobado' },
    REJECTED: { variant: 'red',    label: 'Rechazado' },
    VOIDED:   { variant: 'gray',   label: 'Anulado' },
  }
  const cfg = map[status] ?? { variant: 'gray', label: status }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

export function MovementsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const canManage = role === 'ADMIN' || role === 'SUPERVISOR'

  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<MovementType | ''>('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')

  // Reject modal
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState('')

  // Void modal
  const [voidId, setVoidId] = useState<string | null>(null)
  const [voidNotes, setVoidNotes] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['movements', page, typeFilter, statusFilter],
    queryFn: () => movementsApi.list({
      page,
      limit: 20,
      type: typeFilter || undefined,
      status: statusFilter || undefined,
    }),
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['movements'] })
    qc.invalidateQueries({ queryKey: ['stock'] })
  }

  const approveMutation = useMutation({
    mutationFn: (id: string) => movementsApi.approve(id),
    onSuccess: invalidate,
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      movementsApi.reject(id, comment),
    onSuccess: () => { invalidate(); setRejectId(null); setRejectComment('') },
  })

  const voidMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      movementsApi.void(id, notes),
    onSuccess: () => { invalidate(); setVoidId(null); setVoidNotes('') },
  })

  const hasNext = data ? data.data.length === 20 : false
  const pendingCount = data?.data.filter((m) => m.status === 'PENDING').length ?? 0

  return (
    <div className="space-y-4">
      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-44">
          <Select
            label=""
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as MovementType | ''); setPage(1) }}
            options={TYPE_OPTIONS}
          />
        </div>
        <div className="w-44">
          <Select
            label=""
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1) }}
            options={STATUS_OPTIONS}
          />
        </div>
        {canManage && pendingCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
            <span className="material-icons text-sm">schedule</span>
            {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
          </span>
        )}
        <div className="ml-auto">
          <Button onClick={() => navigate('/movements/new')} icon="add">Nuevo Movimiento</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Subtipo</th>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Almacén</th>
                  <th className="px-4 py-3 font-medium text-right">Cantidad</th>
                  <th className="px-4 py-3 font-medium text-right">Costo Unit.</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  {canManage && <th className="px-4 py-3 font-medium text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.data.map((m) => (
                  <tr key={m.id} className={`hover:bg-gray-50 ${m.status === 'VOIDED' ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className={`px-4 py-3 font-semibold ${TYPE_COLOR[m.type] ?? 'text-gray-700'}`}>
                      {TYPE_LABEL[m.type] ?? m.type}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {SUBTYPE_LABEL[m.subtype] ?? m.subtype}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      <div>{m.productName}</div>
                      {m.status === 'REJECTED' && m.rejectionComment && (
                        <div className="text-xs text-red-500 mt-0.5">{m.rejectionComment}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.warehouseName}</td>
                    <td className="px-4 py-3 text-right">
                      {parseFloat(m.quantity).toLocaleString('es-PE', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {m.status === 'PENDING' && m.type === 'EXIT'
                        ? '—'
                        : `S/ ${parseFloat(m.unitCost).toFixed(4)}`
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(m.createdAt).toLocaleString('es-PE')}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        {m.status === 'PENDING' && ADJUSTMENT_SUBTYPES.has(m.subtype) && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => approveMutation.mutate(m.id)}
                              disabled={approveMutation.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <span className="material-icons text-sm">check</span>
                              Aprobar
                            </button>
                            <button
                              onClick={() => { setRejectId(m.id); setRejectComment('') }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium transition-colors"
                            >
                              <span className="material-icons text-sm">close</span>
                              Rechazar
                            </button>
                          </div>
                        )}
                        {m.status === 'APPROVED' && VOIDABLE_SUBTYPES.has(m.subtype) && (
                          <button
                            onClick={() => { setVoidId(m.id); setVoidNotes('') }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium transition-colors"
                          >
                            <span className="material-icons text-sm">undo</span>
                            Anular
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.data.length && (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">Sin movimientos.</div>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Página {page}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                Anterior
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!hasNext}>
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Reject modal */}
      <Modal
        open={!!rejectId}
        onClose={() => setRejectId(null)}
        title="Rechazar ajuste"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Indica el motivo del rechazo. El solicitante podrá verlo en la lista de movimientos.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Ej: Cantidad incorrecta, falta documentación de respaldo..."
            />
          </div>
          {rejectMutation.isError && (
            <p className="text-sm text-red-600">{(rejectMutation.error as Error).message}</p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRejectId(null)}>Cancelar</Button>
            <Button
              variant="danger"
              icon="close"
              loading={rejectMutation.isPending}
              disabled={!rejectComment.trim()}
              onClick={() => rejectId && rejectMutation.mutate({ id: rejectId, comment: rejectComment.trim() })}
            >
              Rechazar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Void modal */}
      <Modal
        open={!!voidId}
        onClose={() => setVoidId(null)}
        title="Anular movimiento"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Se creará un <strong>contraasiento</strong> que revierte el efecto del movimiento sobre el stock y el kardex. Esta acción no se puede deshacer.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
            <textarea
              value={voidNotes}
              onChange={(e) => setVoidNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Motivo de la anulación..."
            />
          </div>
          {voidMutation.isError && (
            <p className="text-sm text-red-600">{(voidMutation.error as Error).message}</p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setVoidId(null)}>Cancelar</Button>
            <Button
              variant="danger"
              icon="undo"
              loading={voidMutation.isPending}
              onClick={() => voidId && voidMutation.mutate({ id: voidId, notes: voidNotes || undefined })}
            >
              Confirmar anulación
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
