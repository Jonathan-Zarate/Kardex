import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/api/audit'
import { Spinner } from '@/components/ui/Spinner'
import type { AuditLog } from '@/types/api'

const PAGE_SIZE = 50

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  DEACTIVATE: 'bg-orange-100 text-orange-700',
  UNLOCK: 'bg-purple-100 text-purple-700',
  APPROVE: 'bg-teal-100 text-teal-700',
  REJECT: 'bg-red-100 text-red-700',
  VOID: 'bg-gray-100 text-gray-600',
  LOGIN: 'bg-indigo-100 text-indigo-700',
}

function actionColor(action: string) {
  const prefix = Object.keys(ACTION_COLORS).find((k) => action.startsWith(k))
  return prefix ? ACTION_COLORS[prefix] : 'bg-gray-100 text-gray-600'
}

function JsonDiff({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  if (!value) return null
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">{label}</p>
      <pre className="text-[10px] bg-gray-50 border border-gray-200 rounded-lg p-2 overflow-auto max-h-32 whitespace-pre-wrap break-all">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

function AuditRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false)
  const hasPayload = log.oldValue !== null || log.newValue !== null

  return (
    <>
      <tr
        className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${hasPayload ? 'cursor-pointer' : ''}`}
        onClick={() => hasPayload && setExpanded((v) => !v)}
      >
        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
          {new Date(log.createdAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'medium' })}
        </td>
        <td className="px-4 py-3">
          <div className="text-sm font-medium text-gray-800">{log.userName ?? '—'}</div>
          <div className="text-xs text-gray-400">{log.userEmail ?? ''}</div>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${actionColor(log.action)}`}>
            {log.action}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-gray-700">{log.entity}</div>
          {log.entityId && (
            <div className="text-[10px] text-gray-400 font-mono">{log.entityId.slice(0, 8)}…</div>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{log.ip ?? '—'}</td>
        <td className="px-4 py-3 text-center">
          {hasPayload && (
            <span className={`material-icons text-[16px] text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          )}
        </td>
      </tr>
      {expanded && hasPayload && (
        <tr className="border-b border-gray-100 bg-gray-50">
          <td colSpan={6} className="px-4 py-3">
            <div className="flex gap-4">
              <JsonDiff label="Valor anterior" value={log.oldValue} />
              <JsonDiff label="Valor nuevo" value={log.newValue} />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function AuditPage() {
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)

  const params = {
    entity: entity || undefined,
    action: action || undefined,
    from: from || undefined,
    to: to || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditApi.list(params),
    placeholderData: (prev) => prev,
  })

  const { data: entities = [] } = useQuery({
    queryKey: ['audit-entities'],
    queryFn: auditApi.entities,
    staleTime: 60_000,
  })

  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function applyFilters() {
    setPage(0)
  }

  function clearFilters() {
    setEntity('')
    setAction('')
    setFrom('')
    setTo('')
    setPage(0)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Registro de Auditoría</h1>
          <p className="text-sm text-gray-500 mt-0.5">Historial inmutable de acciones sobre entidades críticas</p>
        </div>
        {isFetching && !isLoading && <Spinner size="sm" />}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Entidad</label>
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Todas</option>
              {entities.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Acción</label>
            <input
              type="text"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="ej. CREATE, UPDATE…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={applyFilters}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Filtrar
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>{total.toLocaleString('es-PE')} registro{total !== 1 ? 's' : ''}</span>
          {totalPages > 1 && (
            <span>Página {page + 1} de {totalPages}</span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : !data?.data.length ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <span className="material-icons text-4xl mb-2">manage_search</span>
            <p className="text-sm">Sin registros para los filtros seleccionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 font-medium">Fecha y hora</th>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Acción</th>
                  <th className="px-4 py-3 font-medium">Entidad</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((log) => (
                  <AuditRow key={log.id} log={log} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              <span className="material-icons text-[16px]">chevron_left</span>
              Anterior
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const pageNum = totalPages <= 7
                  ? i
                  : page < 4
                    ? i
                    : page > totalPages - 5
                      ? totalPages - 7 + i
                      : page - 3 + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                      pageNum === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Siguiente
              <span className="material-icons text-[16px]">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
