import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatAmount, formatDateTime } from '../lib/format'

type LoanStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

interface LoanRequest {
  id: string
  amount: number
  durationMonths: number
  interestPct: number
  totalRepay: number
  status: LoanStatus
  note: string | null
  requestedAt: string
  reviewedAt: string | null
  reviewNote: string | null
  client: { id: string; firstName: string; lastName: string; carnetNumber: string; phone: string }
  collector: { id: string; firstName: string; lastName: string }
  reviewedBy: { firstName: string; lastName: string } | null
}

const STATUS_STYLES: Record<LoanStatus, string> = {
  PENDING:   'bg-amber-100 text-amber-700',
  APPROVED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}
const STATUS_LABELS: Record<LoanStatus, string> = {
  PENDING:   'En attente',
  APPROVED:  'Approuvé',
  REJECTED:  'Rejeté',
  CANCELLED: 'Annulé',
}

export function LoanRequestsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<string>('PENDING')
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  const { data, isLoading } = useQuery<{ data: LoanRequest[] }>({
    queryKey: ['loan-requests', filter],
    queryFn: () => api.get(`/credit/requests${filter !== 'ALL' ? `?status=${filter}` : ''}`).then(r => r.data),
    refetchInterval: 30_000,
  })

  const approve = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      api.post(`/credit/requests/${id}/approve`, { reviewNote: note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loan-requests'] }); setReviewId(null); setReviewNote('') },
  })
  const reject = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      api.post(`/credit/requests/${id}/reject`, { reviewNote: note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loan-requests'] }); setReviewId(null); setReviewNote('') },
  })

  const requests = data?.data ?? []
  const pending = requests.filter(r => r.status === 'PENDING').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Demandes de crédit</h2>
          <p className="text-sm text-gray-500 mt-0.5">Gérez les demandes de prêt soumises par les collecteurs</p>
        </div>
        {pending > 0 && (
          <span className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 font-semibold text-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            {pending} en attente
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === s
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {s === 'ALL' ? 'Tous' : STATUS_LABELS[s as LoanStatus]}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Client</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Montant</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Durée / Taux</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Remboursement</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Statut</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Date</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map(req => (
                <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900">{req.client.firstName} {req.client.lastName}</p>
                    <p className="text-xs text-gray-400">{req.client.carnetNumber} · {req.client.phone}</p>
                    <p className="text-xs text-gray-400 mt-0.5">via {req.collector.firstName} {req.collector.lastName}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-gray-900">{formatAmount(req.amount)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-700">{req.durationMonths} mois</p>
                    <p className="text-xs text-gray-400">{req.interestPct}% d'intérêt</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-indigo-700">{formatAmount(req.totalRepay)}</p>
                    <p className="text-xs text-gray-400">+{formatAmount(req.totalRepay - req.amount)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[req.status]}`}>
                      {STATUS_LABELS[req.status]}
                    </span>
                    {req.reviewedBy && (
                      <p className="text-xs text-gray-400 mt-1">par {req.reviewedBy.firstName} {req.reviewedBy.lastName}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-xs text-gray-600">{formatDateTime(req.requestedAt)}</p>
                    {req.note && <p className="text-xs text-gray-400 mt-0.5 italic">"{req.note}"</p>}
                  </td>
                  <td className="px-5 py-4">
                    {req.status === 'PENDING' && (
                      reviewId === req.id ? (
                        <div className="space-y-2 min-w-40">
                          <input value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                            placeholder="Note (optionnel)"
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                          <div className="flex gap-1.5">
                            <button onClick={() => approve.mutate({ id: req.id, note: reviewNote })}
                              disabled={approve.isPending}
                              className="flex-1 px-2 py-1 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                              ✓ Approuver
                            </button>
                            <button onClick={() => reject.mutate({ id: req.id, note: reviewNote })}
                              disabled={reject.isPending}
                              className="flex-1 px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
                              ✕ Rejeter
                            </button>
                          </div>
                          <button onClick={() => { setReviewId(null); setReviewNote('') }}
                            className="w-full text-xs text-gray-400 hover:text-gray-600">Annuler</button>
                        </div>
                      ) : (
                        <button onClick={() => setReviewId(req.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100">
                          Traiter
                        </button>
                      )
                    )}
                    {req.status !== 'PENDING' && req.reviewNote && (
                      <p className="text-xs text-gray-400 italic max-w-32 truncate" title={req.reviewNote}>"{req.reviewNote}"</p>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan={7} className="py-16 text-center text-gray-400">Aucune demande {filter !== 'ALL' ? STATUS_LABELS[filter as LoanStatus].toLowerCase() : ''}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
