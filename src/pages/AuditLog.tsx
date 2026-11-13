import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { formatDateTime } from '../lib/format'

interface AuditEntry {
  id: number
  at: string
  actor?: { firstName: string; lastName: string }
  actorRole: string
  action: string
  entity: string
  entityId: string | null
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  CREATE_USER: 'Création utilisateur',
  UPDATE_USER: 'Modif. utilisateur',
  DEACTIVATE_USER: 'Désactivation utilisateur',
  RESET_PIN: 'Réinit. PIN',
  APPROVE_DEVICE: 'Appareil approuvé',
  REVOKE_DEVICE: 'Appareil révoqué',
  RESTORE_DEVICE: 'Appareil restauré',
  CREATE_CLIENT: 'Nouveau client',
  UPDATE_CLIENT: 'Modif. client',
  CREATE_LOAN_REQUEST: 'Demande de prêt',
  APPROVE_LOAN: 'Prêt approuvé',
  REJECT_LOAN: 'Prêt rejeté',
  LOAN_REPAYMENT_RECORDED: 'Remboursement enregistré',
  LOAN_REPAYMENT_CONFIRMED: 'Remboursement confirmé',
  LOAN_REPAYMENT_REJECTED: 'Remboursement rejeté',
  CONFIRM_HANDOVER: 'Versement confirmé',
  VOID_COLLECTION: 'Annulation encaissement',
  CREATE_COLLECTION: 'Encaissement',
  CREATE_CYCLE: 'Nouveau cycle',
  CLOSE_CYCLE: 'Cycle clôturé',
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-blue-100 text-blue-700',
  LOGOUT: 'bg-gray-100 text-gray-500',
  CREATE_USER: 'bg-indigo-100 text-indigo-700',
  UPDATE_USER: 'bg-indigo-50 text-indigo-600',
  DEACTIVATE_USER: 'bg-red-100 text-red-700',
  RESET_PIN: 'bg-amber-100 text-amber-700',
  APPROVE_DEVICE: 'bg-green-100 text-green-700',
  REVOKE_DEVICE: 'bg-red-100 text-red-700',
  RESTORE_DEVICE: 'bg-blue-100 text-blue-700',
  CREATE_CLIENT: 'bg-emerald-100 text-emerald-700',
  UPDATE_CLIENT: 'bg-emerald-50 text-emerald-600',
  CREATE_LOAN_REQUEST: 'bg-violet-100 text-violet-700',
  APPROVE_LOAN: 'bg-green-100 text-green-700',
  REJECT_LOAN: 'bg-red-100 text-red-700',
  LOAN_REPAYMENT_RECORDED: 'bg-amber-100 text-amber-700',
  LOAN_REPAYMENT_CONFIRMED: 'bg-green-100 text-green-700',
  LOAN_REPAYMENT_REJECTED: 'bg-red-100 text-red-700',
  CONFIRM_HANDOVER: 'bg-purple-100 text-purple-700',
  VOID_COLLECTION: 'bg-orange-100 text-orange-700',
  CREATE_COLLECTION: 'bg-teal-100 text-teal-700',
  CREATE_CYCLE: 'bg-sky-100 text-sky-700',
  CLOSE_CYCLE: 'bg-sky-50 text-sky-600',
}

function getDetailLink(log: AuditEntry): string | null {
  const { action, entity, entityId } = log
  switch (entity) {
    case 'clients':
      return entityId ? `/clients/${entityId}` : '/clients'
    case 'loan_requests':
      if (action === 'CREATE_LOAN_REQUEST' || action === 'REJECT_LOAN') return '/credit'
      return '/active-loans'
    case 'loan_repayments':
      if (action === 'LOAN_REPAYMENT_RECORDED') return '/pending-repayments'
      return '/active-loans'
    case 'users':
      return '/users'
    case 'devices':
      return '/devices'
    case 'collections':
    case 'handovers':
    case 'void_requests':
      return '/caisse'
    default:
      return null
  }
}

export function AuditLogPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => api.get('/audit-log').then((r) => r.data),
  })

  const logs: AuditEntry[] = data?.data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--c-text-h)' }}>Journal d'audit</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--c-text-s)' }}>Historique complet de toutes les actions effectuées sur la plateforme.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: 'var(--c-card)', border: '1px solid var(--c-card-border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--c-input-bg)', borderBottom: '1px solid var(--c-card-border)' }}>
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-xs" style={{ color: 'var(--c-text-s)' }}>Date / Heure</th>
                <th className="text-left px-4 py-3 font-semibold text-xs" style={{ color: 'var(--c-text-s)' }}>Acteur</th>
                <th className="text-left px-4 py-3 font-semibold text-xs" style={{ color: 'var(--c-text-s)' }}>Action</th>
                <th className="text-left px-4 py-3 font-semibold text-xs" style={{ color: 'var(--c-text-s)' }}>Entité</th>
                <th className="w-6 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const link = getDetailLink(log)
                const label = ACTION_LABELS[log.action] ?? log.action
                const color = ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'
                return (
                  <tr
                    key={log.id}
                    onClick={() => link && navigate(link)}
                    className={`transition-colors ${i % 2 === 0 ? '' : 'bg-black/[0.015]'} ${link ? 'cursor-pointer hover:bg-indigo-50/60' : ''}`}
                    style={i < logs.length - 1 ? { borderBottom: '1px solid var(--c-card-border)' } : {}}
                  >
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--c-text-s)' }}>
                      {formatDateTime(log.at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm font-medium" style={{ color: 'var(--c-text-h)' }}>
                        {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : '—'}
                      </span>
                      {log.actorRole && (
                        <span className="ml-1.5 text-xs" style={{ color: 'var(--c-text-s)' }}>({log.actorRole})</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${color}`}>{label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--c-text-s)' }}>
                      {log.entity}
                      {log.entityId && (
                        <span className="ml-1" style={{ color: 'var(--c-text-m)' }}>#{log.entityId.slice(0, 8)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {link && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9,18 15,12 9,6"/>
                        </svg>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {logs.length === 0 && (
            <div className="py-16 text-center text-sm" style={{ color: 'var(--c-text-s)' }}>Aucune entrée dans le journal.</div>
          )}
        </div>
      )}
    </div>
  )
}
