import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatDateTime, STATUS_LABELS } from '../lib/format'

export function DevicesPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.get('/devices').then((r) => r.data),
  })

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/devices/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  })

  const revoke = useMutation({
    mutationFn: (id: string) => api.post(`/devices/${id}/revoke`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  })

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Appareils</h2>
      {isLoading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Collecteur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Modèle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Version</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Dernière sync</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data?.map((device: { id: string; model: string; appVersion: string; status: string; lastSyncAt: string; user: { firstName: string; lastName: string } }) => (
                <tr key={device.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{device.user?.firstName} {device.user?.lastName}</td>
                  <td className="px-4 py-3 text-gray-600">{device.model}</td>
                  <td className="px-4 py-3 text-gray-600">{device.appVersion}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${device.status === 'APPROVED' ? 'bg-green-50 text-green-700' : device.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                      {STATUS_LABELS[device.status] ?? device.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{device.lastSyncAt ? formatDateTime(device.lastSyncAt) : '—'}</td>
                  <td className="px-4 py-3 space-x-2">
                    {device.status === 'PENDING' && (
                      <button onClick={() => approve.mutate(device.id)} className="text-green-600 hover:underline text-xs">Approuver</button>
                    )}
                    {device.status !== 'REVOKED' && (
                      <button onClick={() => revoke.mutate(device.id)} className="text-red-600 hover:underline text-xs">Révoquer</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
