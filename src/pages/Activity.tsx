import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatDateTime } from '../lib/format'

interface ActivityDevice {
  id: string
  model: string
  androidId: string
  appVersion: string
  lastLoginAt: string | null
  lastSyncAt: string | null
  lastLoginLat: number | null
  lastLoginLng: number | null
  user: { id: string; firstName: string; lastName: string; phone: string }
  onlineStatus: 'online' | 'recent' | 'offline'
}

interface PendingDevice {
  id: string
  model: string
  androidId: string
  lastLoginAt: string | null
  lastLoginLat: number | null
  lastLoginLng: number | null
  user: { firstName: string; lastName: string; phone: string }
}

interface LogEntry {
  id: string
  action: string
  entity: string
  entityId: string | null
  actorName: string | null
  actorRole: string | null
  ip: string | null
  at: string
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  CREATE_USER: 'Création utilisateur',
  UPDATE_USER: 'Modif. utilisateur',
  DEACTIVATE_USER: 'Désactivation',
  APPROVE_DEVICE: 'Appareil approuvé',
  REVOKE_DEVICE: 'Appareil révoqué',
  RESTORE_DEVICE: 'Appareil restauré',
  CREATE_CLIENT: 'Nouveau client',
  CONFIRM_HANDOVER: 'Versement confirmé',
  VOID_COLLECTION: 'Annulation encaissement',
  RESET_PIN: 'Réinitialisation PIN',
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-blue-100 text-blue-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
  APPROVE_DEVICE: 'bg-green-100 text-green-700',
  REVOKE_DEVICE: 'bg-red-100 text-red-700',
  RESTORE_DEVICE: 'bg-blue-100 text-blue-700',
  CREATE_CLIENT: 'bg-emerald-100 text-emerald-700',
  CONFIRM_HANDOVER: 'bg-purple-100 text-purple-700',
  VOID_COLLECTION: 'bg-orange-100 text-orange-700',
  CREATE_USER: 'bg-indigo-100 text-indigo-700',
  DEACTIVATE_USER: 'bg-red-100 text-red-700',
  RESET_PIN: 'bg-amber-100 text-amber-700',
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'à l\'instant'
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return formatDateTime(dateStr)
}

export function ActivityPage() {
  const qc = useQueryClient()

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['activity'],
    queryFn: () => api.get('/activity').then((r) => r.data),
    refetchInterval: 20_000,
  })

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/devices/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['activity'] }); qc.invalidateQueries({ queryKey: ['devices'] }) },
  })

  const approvedDevices: ActivityDevice[] = data?.approvedDevices ?? []
  const pendingDevices: PendingDevice[] = data?.pendingDevices ?? []
  const logs: LogEntry[] = data?.logs ?? []

  const online = approvedDevices.filter((d) => d.onlineStatus === 'online')
  const recent = approvedDevices.filter((d) => d.onlineStatus === 'recent')
  const offline = approvedDevices.filter((d) => d.onlineStatus === 'offline')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Activité en direct</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Mise à jour automatique toutes les 20s
            {dataUpdatedAt ? ` · dernière : ${new Date(dataUpdatedAt).toLocaleTimeString('fr-FR')}` : ''}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-200 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />{online.length} en ligne
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 font-medium">
            {recent.length} récents
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg border border-gray-200">
            {offline.length} hors ligne
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column: Device presence ─────────────────── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Pending approvals */}
            {pendingDevices.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {pendingDevices.length} appareil{pendingDevices.length > 1 ? 's' : ''} en attente
                </h3>
                <div className="space-y-3">
                  {pendingDevices.map((d) => (
                    <div key={d.id} className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{d.user.firstName} {d.user.lastName}</p>
                          <p className="text-xs text-gray-500">{d.user.phone}</p>
                          <p className="text-xs text-gray-400 mt-1">📲 {d.model} · {d.androidId}</p>
                          {d.lastLoginAt && <p className="text-xs text-gray-400">{timeAgo(d.lastLoginAt)}</p>}
                          {d.lastLoginLat && d.lastLoginLng && (
                            <a href={`https://www.google.com/maps?q=${d.lastLoginLat},${d.lastLoginLng}`} target="_blank" rel="noopener noreferrer"
                               className="text-xs text-blue-600 hover:underline">📍 Localisation</a>
                          )}
                        </div>
                        <button onClick={() => approve.mutate(d.id)} disabled={approve.isPending}
                          className="px-3 py-1.5 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex-shrink-0">
                          ✓ Approuver
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Online collectors */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Collecteurs ({approvedDevices.length})</h3>
              <div className="space-y-2">
                {[...online, ...recent, ...offline].map((d) => (
                  <div key={d.id} className="flex items-center gap-3 py-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      d.onlineStatus === 'online' ? 'bg-green-500 animate-pulse' :
                      d.onlineStatus === 'recent' ? 'bg-amber-400' :
                      'bg-gray-300'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{d.user.firstName} {d.user.lastName}</p>
                      <p className="text-xs text-gray-400 truncate">{d.model} · {timeAgo(d.lastLoginAt)}</p>
                    </div>
                    {d.lastLoginLat && d.lastLoginLng && (
                      <a href={`https://www.google.com/maps?q=${d.lastLoginLat},${d.lastLoginLng}`}
                         target="_blank" rel="noopener noreferrer"
                         className="text-gray-400 hover:text-blue-600 text-xs flex-shrink-0">📍</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right column: Activity feed ───────────────────── */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">Journal d'activité · 24 dernières heures</h3>
              </div>
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-sm">Aucune activité récente</div>
                ) : logs.map((log) => (
                  <div key={log.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50/50">
                    <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">
                        {log.actorName ?? <span className="text-gray-400">Système</span>}
                        {log.actorRole && <span className="text-xs text-gray-400 ml-1">({log.actorRole})</span>}
                      </p>
                      {log.entityId && (
                        <p className="text-xs font-mono text-gray-400 truncate">{log.entity} · {log.entityId}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-gray-500">{timeAgo(log.at)}</p>
                      <p className="text-xs text-gray-400">{formatDateTime(log.at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
