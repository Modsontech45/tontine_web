import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatAmount, formatDateTime } from '../lib/format'

interface Repayment {
  id: string
  amount: number
  paidAt: string
  note: string | null
  cashier: { firstName: string; lastName: string }
}

interface ActiveLoan {
  id: string
  amount: number
  durationMonths: number
  interestPct: number
  totalRepay: number
  paidAmount: number
  remainingAmount: number
  status: string
  requestedAt: string
  reviewedAt: string | null
  dueDate: string | null
  note: string | null
  client: { id: string; firstName: string; lastName: string; carnetNumber: string; phone: string }
  collector: { id: string; firstName: string; lastName: string }
  reviewedBy: { firstName: string; lastName: string } | null
  repayments: Repayment[]
}

function DueTimer({ dueDate }: { dueDate: string | null }) {
  const [ms, setMs] = useState(() => dueDate ? new Date(dueDate).getTime() - Date.now() : 0)
  useEffect(() => {
    if (!dueDate) return
    const id = setInterval(() => setMs(new Date(dueDate).getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [dueDate])

  if (!dueDate) return <span className="text-gray-400 text-xs">—</span>

  const overdue = ms <= 0
  const abs = Math.abs(ms)
  const s = Math.floor(abs / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60

  const color = overdue ? 'text-red-600 font-bold' : d <= 3 ? 'text-orange-500 font-semibold' : 'text-green-600'
  const parts = d > 0 ? `${d}j ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m` : `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(sec).padStart(2,'0')}s`

  return (
    <span className={`font-mono text-xs tabular-nums ${color}`}>
      {overdue ? '⚠ En retard ' : ''}{parts}
    </span>
  )
}

function RepayModal({ loan, onClose }: { loan: ActiveLoan; onClose: () => void }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [fullPay, setFullPay] = useState(false)

  const repay = useMutation({
    mutationFn: (data: { amount: number; note?: string }) =>
      api.post(`/credit/requests/${loan.id}/repay`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['active-loans'] }); onClose() },
  })

  const effectiveAmount = fullPay ? loan.remainingAmount : parseInt(amount) || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Enregistrer un paiement</h3>
          <p className="text-sm text-gray-500 mt-0.5">{loan.client.firstName} {loan.client.lastName} · {loan.client.carnetNumber}</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total dû', value: formatAmount(loan.totalRepay), color: 'text-gray-800' },
            { label: 'Déjà payé', value: formatAmount(loan.paidAmount), color: 'text-green-600' },
            { label: 'Reste', value: formatAmount(loan.remainingAmount), color: 'text-indigo-700 font-bold' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400">{label}</p>
              <p className={`text-sm mt-0.5 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Repayment history */}
        {loan.repayments.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase">Historique des paiements</p>
            {loan.repayments.map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs bg-green-50 rounded-lg px-3 py-2">
                <span className="text-green-700 font-semibold">{formatAmount(r.amount)}</span>
                <span className="text-gray-400">{formatDateTime(r.paidAt)} · {r.cashier.firstName} {r.cashier.lastName}</span>
              </div>
            ))}
          </div>
        )}

        {/* Payment input */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={fullPay} onChange={e => setFullPay(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-600" />
            <span className="text-sm font-medium text-gray-700">Paiement intégral ({formatAmount(loan.remainingAmount)})</span>
          </label>

          {!fullPay && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Montant (FCFA)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                min={1} max={loan.remainingAmount} placeholder={`Max ${formatAmount(loan.remainingAmount)}`}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Note (optionnel)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="Ex: paiement cash"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>

        {repay.isError && (
          <p className="text-sm text-red-500">{(repay.error as any)?.response?.data?.error?.message ?? 'Erreur'}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={() => repay.mutate({ amount: effectiveAmount, note: note || undefined })}
            disabled={repay.isPending || effectiveAmount <= 0}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
          >
            {repay.isPending ? 'En cours…' : `Payer ${formatAmount(effectiveAmount)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ActiveLoansPage() {
  const [selectedLoan, setSelectedLoan] = useState<ActiveLoan | null>(null)

  const { data, isLoading } = useQuery<{ data: ActiveLoan[] }>({
    queryKey: ['active-loans'],
    queryFn: () => api.get('/credit/active-loans').then(r => r.data),
    refetchInterval: 30_000,
  })

  const loans = data?.data ?? []

  return (
    <div className="space-y-6">
      {selectedLoan && <RepayModal loan={selectedLoan} onClose={() => setSelectedLoan(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--c-text-h)' }}>Prêts en cours</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--c-text-s)' }}>
            Suivez les remboursements des clients
          </p>
        </div>
        {loans.length > 0 && (
          <span className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--c-card)', border: '1px solid var(--c-card-border)', color: 'var(--c-text-h)' }}>
            {loans.length} prêt{loans.length > 1 ? 's' : ''} actif{loans.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" /></div>
      ) : loans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3"
          style={{ background: 'var(--c-card)', border: '1px solid var(--c-card-border)', borderRadius: 16 }}>
          <span className="text-4xl">🎉</span>
          <p className="font-semibold" style={{ color: 'var(--c-text-h)' }}>Aucun prêt actif</p>
          <p className="text-sm" style={{ color: 'var(--c-text-s)' }}>Tous les prêts ont été remboursés</p>
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map(loan => {
            const pct = Math.round((loan.paidAmount / loan.totalRepay) * 100)
            const overdue = loan.dueDate && new Date(loan.dueDate) < new Date()
            return (
              <div key={loan.id} className="rounded-2xl p-5 space-y-4"
                style={{ background: 'var(--c-card)', border: `1px solid ${overdue ? '#fca5a5' : 'var(--c-card-border)'}` }}>

                {/* Header row */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-bold text-base" style={{ color: 'var(--c-text-h)' }}>
                      {loan.client.firstName} {loan.client.lastName}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-s)' }}>
                      {loan.client.carnetNumber} · {loan.client.phone}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-s)' }}>
                      via {loan.collector.firstName} {loan.collector.lastName}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-indigo-600 text-lg">{formatAmount(loan.amount)}</p>
                    <p className="text-xs" style={{ color: 'var(--c-text-s)' }}>{loan.durationMonths} mois · {loan.interestPct}%</p>
                    <p className="text-xs font-semibold" style={{ color: 'var(--c-text-h)' }}>Total: {formatAmount(loan.totalRepay)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: 'var(--c-text-s)' }}>Remboursé: <strong style={{ color: 'var(--c-text-h)' }}>{formatAmount(loan.paidAmount)}</strong></span>
                    <span style={{ color: 'var(--c-text-s)' }}>Reste: <strong className="text-indigo-600">{formatAmount(loan.remainingAmount)}</strong></span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--c-card-border)' }}>
                    <div className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--c-text-s)' }}>{pct}% remboursé</p>
                </div>

                {/* Due date countdown */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--c-text-s)' }}>Échéance: {loan.dueDate ? formatDateTime(loan.dueDate) : '—'}</p>
                    <DueTimer dueDate={loan.dueDate} />
                  </div>
                  <button onClick={() => setSelectedLoan(loan)}
                    className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                    Enregistrer paiement
                  </button>
                </div>

                {/* Repayment chips */}
                {loan.repayments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {loan.repayments.map(r => (
                      <span key={r.id} className="px-3 py-1 text-xs rounded-full font-semibold"
                        style={{ background: 'rgba(99,102,241,0.1)', color: '#4f46e5' }}>
                        +{formatAmount(r.amount)} · {new Date(r.paidAt).toLocaleDateString('fr-FR')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
