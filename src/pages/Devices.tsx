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
  lastSyncAt: string | null
  lastLoginLat: number | null
  lastLoginLng: number | null
  createdAt: string
  user: { id: string; firstName: string; lastName: string; phone: string }
}

function onlineStatus(device: Device): 'online' | 'recent' | 'offline' {
  const now = Date.now()
  if (device.lastSyncAt && now - new Date(device.lastSyncAt).getTime() < 30 * 60 * 1000) return 'online'
  if (device.lastLoginAt && now - new Date(device.lastLoginAt).getTime() < 2 * 60 * 60 * 1000) return 'recent'
  return 'offline'
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'il y a quelques secondes'
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return formatDateTime(dateStr)
}

function OnlineDot({ status }: { status: 'online' | 'recent' | 'offline' }) {
  if (status === 'online')
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />En ligne</span>
  if (status === 'recent')
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Récent</span>
  return <span className="inline-flex items-center gap-1 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />Hors ligne</span>
}

function StatusBadge({ status }: { status: Device['status'] }) {
  if (status === 'APPROVED')
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Approuvé</span>
  if (status === 'PENDING')
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 animate-pulse">Nouveau</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Révoqué</span>
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
  const onlineCount = approved.filter((d) => onlineStatus(d) === 'online').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Appareils</h2>
          <p className="text-sm text-gray-500 mt-0.5">Gérez les appareils des collecteurs · actualisation auto toutes les 30s</p>
        </div>
        <div className="flex gap-2 text-sm flex-wrap">
          {pending.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg font-medium border border-red-200">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />{pending.length} en attente
            </span>
          )}
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />{onlineCount} en ligne
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg font-medium border border-gray-200">
            {approved.length} approuvés
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">Chargement...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Collecteur</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Appareil</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Connexion</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Localisation</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* Pending first */}
              {pending.map((d) => <DeviceRow key={d.id} device={d} onApprove={() => approve.mutate(d.id)} onRevoke={() => revoke.mutate(d.id)} busy={approve.isPending || revoke.isPending || restore.isPending} />)}
              {/* Approved */}
              {approved.map((d) => <DeviceRow key={d.id} device={d} onRevoke={() => revoke.mutate(d.id)} busy={approve.isPending || revoke.isPending || restore.isPending} />)}
              {/* Revoked */}
              {revoked.map((d) => <DeviceRow key={d.id} device={d} onRestore={() => restore.mutate(d.id)} busy={approve.isPending || revoke.isPending || restore.isPending} />)}
            </tbody>
          </table>
          {devices.length === 0 && (
            <div className="text-center py-12 text-gray-400">Aucun appareil enregistré</div>
          )}
        </div>
      )}
    </div>
  )
}

function DeviceRow({ device, onApprove, onRevoke, onRestore, busy }: {
  device: Device
  onApprove?: () => void
  onRevoke?: () => void
  onRestore?: () => void
  busy: boolean
}) {
  const status = onlineStatus(device)
  const mapsUrl = device.lastLoginLat && device.lastLoginLng
    ? `https://www.google.com/maps?q=${device.lastLoginLat},${device.lastLoginLng}`
    : null

  const rowBg =
    device.status === 'PENDING' ? 'bg-red-50 hover:bg-red-100' :
    device.status === 'REVOKED' ? 'bg-gray-50 opacity-70 hover:opacity-90' :
    'hover:bg-blue-50/30'

  return (
    <tr className={`transition-colors ${rowBg}`}>
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900">{device.user?.firstName} {device.user?.lastName}</div>
        <div className="text-xs text-gray-400 mt-0.5">{device.user?.phone}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-gray-800">{device.model || '—'}</div>
        <div className="text-xs font-mono text-gray-400 mt-0.5">{device.androidId}</div>
        <div className="text-xs text-gray-400">v{device.appVersion}</div>
      </td>
      <td className="px-4 py-3 space-y-1">
        <div><StatusBadge status={device.status} /></div>
        {device.status === 'APPROVED' && <OnlineDot status={status} />}
      </td>
      <td className="px-4 py-3">
        {device.lastLoginAt ? (
          <>
            <div className="text-gray-700 font-medium">{timeAgo(device.lastLoginAt)}</div>
            <div className="text-xs text-gray-400">{formatDateTime(device.lastLoginAt)}</div>
          </>
        ) : <span className="text-gray-400">—</span>}
      </td>
      <td className="px-4 py-3">
        {mapsUrl ? (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm font-medium">
            📍 Voir
          </a>
        ) : <span className="text-gray-400 text-xs">Non disponible</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2 flex-wrap">
          {device.status === 'PENDING' && onApprove && (
            <button onClick={onApprove} disabled={busy}
              className="px-3 py-1 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              Approuver
            </button>
          )}
          {device.status === 'REVOKED' && onRestore && (
            <button onClick={onRestore} disabled={busy}
              className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              Restaurer
            </button>
          )}
          {device.status !== 'REVOKED' && onRevoke && (
            <button onClick={onRevoke} disabled={busy}
              className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50">
              Révoquer
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
