import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatDateTime } from '../lib/format'

export function AuditLogPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => api.get('/audit-log').then((r) => r.data),
  })

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Journal d'audit</h2>
      {isLoading ? <p className="text-gray-500">Chargement...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date/heure</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Acteur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Entité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data?.map((log: { id: number; at: string; actor?: { firstName: string; lastName: string }; actorRole: string; action: string; entity: string; entityId: string }) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500 text-xs">{formatDateTime(log.at)}</td>
                  <td className="px-4 py-2">
                    {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : '—'}
                    <span className="ml-1 text-xs text-gray-400">({log.actorRole})</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{log.action}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">{log.entity} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
