import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatAmount, formatDateTime } from '../lib/format'

interface PendingRepayment {
  id: string
  amount: number
  recordedAt: string
  note: string | null
  collector: { id: string; firstName: string; lastName: string } | null
  loan: {
    id: string
    amount: number
    totalRepay: number
    dueDate: string | null
    client: { id: string; firstName: string; lastName: string; carnetNumber: string; phone: string }
  }
}

function RejectModal({ repayment, onClose, onConfirm }: {
  repayment: PendingRepayment
  onClose: () => void
  onConfirm: (note: string) => void
}) {
  const [note, setNote] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4" style={{ background: 'var(--c-card)', border: '1px solid var(--c-card-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--c-text-h)' }}>Rejeter le remboursement</p>
            <p className="text-xs" style={{ color: 'var(--c-text-s)' }}>
              {repayment.loan.client.firstName} {repayment.loan.client.lastName} · {formatAmount(repayment.amount)} FCFA
            </p>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--c-text-s)' }}>
            Motif du rejet <span className="text-red-500">*</span>
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="Ex: Montant incorrect, billet non conforme…"
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            style={{ background: 'var(--c-input-bg)', border: `1px solid ${note.trim() ? 'var(--c-input-border)' : '#ef4444'}`, color: 'var(--c-text-h)' }}
          />
          {!note.trim() && (
            <p className="text-xs text-red-500 mt-1">Un motif est requis pour rejeter un remboursement.</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(note)}
            disabled={!note.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Confirmer le rejet
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'var(--c-input-bg)', color: 'var(--c-text-s)' }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

export function PendingRepaymentsPage() {
  const qc = useQueryClient()
  const [rejectTarget, setRejectTarget] = useState<PendingRepayment | null>(null)
  const [flash, setFlash] = useState<{ id: string; type: 'confirmed' | 'rejected' } | null>(null)

  const { data, isLoading } = useQuery<{ data: PendingRepayment[] }>({
    queryKey: ['pending-repayments'],
    queryFn: () => api.get('/credit/pending-repayments').then(r => r.data),
    refetchInterval: 30_000,
  })

  const confirm = useMutation({
    mutationFn: (id: string) => api.post(`/credit/repayments/${id}/confirm`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['pending-repayments'] })
      qc.invalidateQueries({ queryKey: ['active-loans'] })
      setFlash({ id, type: 'confirmed' })
      setTimeout(() => setFlash(null), 2500)
    },
  })

  const reject = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.post(`/credit/repayments/${id}/reject`, { note: note || undefined }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['pending-repayments'] })
      setRejectTarget(null)
      setFlash({ id, type: 'rejected' })
      setTimeout(() => setFlash(null), 2500)
    },
  })

  const repayments = data?.data ?? []

  const card: React.CSSProperties = { background: 'var(--c-card)', border: '1px solid var(--c-card-border)' }
  const sub: React.CSSProperties = { color: 'var(--c-text-s)' }
  const heading: React.CSSProperties = { color: 'var(--c-text-h)' }

  return (
    <div className="max-w-3xl space-y-6">
      {rejectTarget && (
        <RejectModal
          repayment={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={(note) => reject.mutate({ id: rejectTarget.id, note })}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={heading}>Remboursements terrain</h2>
          <p className="text-sm mt-1" style={sub}>Paiements enregistrés sur le terrain en attente de confirmation à la caisse.</p>
        </div>
        {repayments.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-card-border)' }}>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-bold" style={heading}>{repayments.length}</span>
            <span className="text-sm" style={sub}>en attente</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && repayments.length === 0 && (
        <div className="rounded-2xl shadow-sm p-12 text-center" style={card}>
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--c-input-bg)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          </div>
          <p className="font-bold text-base" style={heading}>Tout est à jour</p>
          <p className="text-sm mt-1" style={sub}>Aucun remboursement terrain en attente de confirmation.</p>
        </div>
      )}

      {/* Repayment cards */}
      {!isLoading && repayments.map((r) => {
        const isFlash = flash?.id === r.id
        return (
          <div
            key={r.id}
            className={`rounded-2xl shadow-sm p-5 transition-all ${isFlash ? (flash.type === 'confirmed' ? 'ring-2 ring-green-400' : 'ring-2 ring-red-400') : ''}`}
            style={card}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Client + loan info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base" style={heading}>
                    {r.loan.client.firstName} {r.loan.client.lastName}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-lg" style={{ background: 'var(--c-input-bg)', color: 'var(--c-text-m)' }}>
                    {r.loan.client.carnetNumber}
                  </span>
                  <span className="text-xs" style={sub}>{r.loan.client.phone}</span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-3 text-center" style={{ background: 'var(--c-input-bg)' }}>
                    <p className="text-xs" style={sub}>Montant versé</p>
                    <p className="text-sm font-bold mt-0.5 text-amber-500">{formatAmount(r.amount)} FCFA</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: 'var(--c-input-bg)' }}>
                    <p className="text-xs" style={sub}>Total prêt</p>
                    <p className="text-sm font-semibold mt-0.5" style={heading}>{formatAmount(r.loan.totalRepay)} FCFA</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: 'var(--c-input-bg)' }}>
                    <p className="text-xs" style={sub}>Enregistré le</p>
                    <p className="text-xs font-medium mt-0.5" style={heading}>{formatDateTime(r.recordedAt)}</p>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-4 text-xs flex-wrap" style={sub}>
                  {r.collector && (
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Collecteur: {r.collector.firstName} {r.collector.lastName}
                    </span>
                  )}
                  {r.note && (
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                      Note: {r.note}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={() => confirm.mutate(r.id)}
                  disabled={confirm.isPending}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
                  Confirmer
                </button>
                <button
                  onClick={() => setRejectTarget(r)}
                  disabled={reject.isPending}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  style={{ border: '1px solid', borderColor: '#ef4444' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Rejeter
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
