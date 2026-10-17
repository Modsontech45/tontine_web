import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatDateTime } from '../lib/format'

interface Device {
  id: string
  model: string
  androidId: string
  appVersion: string
  status: 'PENDING' | 'APPROVED' | 'REVOKED'
  lastLoginAt: string | null
  lastLoginLat: number | null
  lastLoginLng: number | null
  lastSyncAt: string | null
  createdAt: string
  user: { id: string; firstName: string; lastName: string; phone: string }
}

function StatusBadge({ status }: { status: Device['status'] }) {
  if (status === 'APPROVED')
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Approuvé</span>
  if (status === 'PENDING')
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700"><span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />Nouveau</span>
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />Révoqué</span>
}

export function DevicesPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.get('/devices').then((r) => r.data),
    refetchInterval: 30_000,
  })

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/devices/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  })

  const revoke = useMutation({
    mutationFn: (id: string) => api.post(`/devices/${id}/revoke`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  })

  const restore = useMutation({
    mutationFn: (id: string) => api.post(`/devices/${id}/restore`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  })

  const devices: Device[] = data?.data ?? []
  const pending = devices.filter((d) => d.status === 'PENDING')
  const approved = devices.filter((d) => d.status === 'APPROVED')
  const revoked = devices.filter((d) => d.status === 'REVOKED')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Appareils</h2>
          <p className="text-sm text-gray-500 mt-1">Gérez les appareils des collecteurs</p>
        </div>
        <div className="flex gap-3 text-sm">
          {pending.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg font-medium border border-red-200">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
              {pending.length} en attente
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium border border-green-200">
            {approved.length} approuvé{approved.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">Chargement...</div>
      ) : devices.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Aucun appareil enregistré</div>
      ) : (
        <div className="space-y-3">
          {/* Pending (new) devices — shown first */}
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider px-1">Nouveaux appareils — approbation requise</p>
              {pending.map((d) => <DeviceCard key={d.id} device={d} onApprove={() => approve.mutate(d.id)} onRevoke={() => revoke.mutate(d.id)} approving={approve.isPending} revoking={revoke.isPending} restoring={restore.isPending} />)}
            </div>
          )}

          {/* Approved devices */}
          {approved.length > 0 && (
            <div className="space-y-2">
              {pending.length > 0 && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 pt-2">Appareils approuvés</p>}
              {approved.map((d) => <DeviceCard key={d.id} device={d} onRevoke={() => revoke.mutate(d.id)} approving={approve.isPending} revoking={revoke.isPending} restoring={restore.isPending} />)}
            </div>
          )}

          {/* Revoked devices */}
          {revoked.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 pt-2">Révoqués</p>
              {revoked.map((d) => <DeviceCard key={d.id} device={d} onRestore={() => restore.mutate(d.id)} approving={approve.isPending} revoking={revoke.isPending} restoring={restore.isPending} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DeviceCard({ device, onApprove, onRevoke, onRestore, approving, revoking, restoring }: {
  device: Device
  onApprove?: () => void
  onRevoke?: () => void
  onRestore?: () => void
  approving: boolean
  revoking: boolean
  restoring: boolean
}) {
  const isNew = device.status === 'PENDING'
  const isRevoked = device.status === 'REVOKED'

  const mapsUrl = device.lastLoginLat && device.lastLoginLng
    ? `https://www.google.com/maps?q=${device.lastLoginLat},${device.lastLoginLng}`
    : null

  return (
    <div className={`rounded-xl border-2 p-4 flex items-start gap-4 transition-all ${
      isNew ? 'border-red-300 bg-red-50' :
      isRevoked ? 'border-gray-200 bg-gray-50 opacity-60' :
      'border-green-200 bg-white'
    }`}>
      {/* Status dot */}
      <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
        isNew ? 'bg-red-100' : isRevoked ? 'bg-gray-100' : 'bg-green-100'
      }`}>
        <span className="text-lg">{isNew ? '📵' : isRevoked ? '🚫' : '📱'}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900">
            {device.user?.firstName} {device.user?.lastName}
          </span>
          <StatusBadge status={device.status} />
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{device.user?.phone}</p>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>📲 {device.model || '—'}</span>
          <span className="font-mono">{device.androidId}</span>
          <span>v{device.appVersion}</span>
        </div>

        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
          {device.lastLoginAt && (
            <span>Dernière connexion : {formatDateTime(device.lastLoginAt)}</span>
          )}
          {mapsUrl ? (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
               className="text-blue-600 hover:underline font-medium">
              📍 Voir la localisation
            </a>
          ) : (
            <span>📍 Localisation non disponible</span>
          )}
          <span>Enregistré le {formatDateTime(device.createdAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        {isNew && onApprove && (
          <button
            onClick={onApprove}
            disabled={approving}
            className="px-4 py-1.5 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Approuver
          </button>
        )}
        {isRevoked && onRestore && (
          <button
            onClick={onRestore}
            disabled={restoring}
            className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Restaurer
          </button>
        )}
        {!isRevoked && onRevoke && (
          <button
            onClick={onRevoke}
            disabled={revoking}
            className="px-4 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Révoquer
          </button>
        )}
      </div>
    </div>
  )
}
