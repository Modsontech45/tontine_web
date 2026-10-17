import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../lib/api'
import { formatAmount, formatDateTime } from '../lib/format'

function ConfirmModal({
  collector,
  expectedAmount,
  businessDate,
  onClose,
  onConfirmed,
}: {
  collector: { collector_id: string; first_name: string; last_name: string }
  expectedAmount: number
  businessDate: string
  onClose: () => void
  onConfirmed: () => void
}) {
  const [receivedAmount, setReceivedAmount] = useState(expectedAmount)
  const [notes, setNotes] = useState('')
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [otpCode, setOtpCode] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const diff = receivedAmount - expectedAmount

  const requestOtp = async () => {
    setSending(true)
    setError('')
    try {
      await api.post('/otp/request', { purpose: 'CONFIRM_HANDOVER' })
      setStep('otp')
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      if (code === 'NO_EMAIL') {
        // No email on account — confirm directly without OTP
        confirmDirect()
      } else {
        setError(err?.response?.data?.error?.message ?? 'Erreur lors de l\'envoi du code')
      }
    } finally {
      setSending(false)
    }
  }

  const confirm = useMutation({
    mutationFn: (otp?: string) =>
      api.post('/handovers/confirm', {
        collector_id: collector.collector_id,
        business_date: businessDate,
        received_amount: receivedAmount,
        notes: notes || undefined,
        otp_code: otp,
      }),
    onSuccess: () => { onConfirmed(); onClose() },
    onError: (err: any) => setError(err?.response?.data?.error?.message ?? 'Erreur'),
  })

  const confirmDirect = () => confirm.mutate(undefined)
  const confirmWithOtp = () => {
    if (otpCode.length !== 6) { setError('Entrez le code à 6 chiffres'); return }
    setError('')
    confirm.mutate(otpCode)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-1">Confirmer le versement</h3>
        <p className="text-sm text-gray-600 mb-4">
          <span className="font-medium">{collector.first_name} {collector.last_name}</span> — {businessDate}
        </p>

        {step === 'form' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Montant attendu (système)</p>
              <p className="text-xl font-bold text-gray-900">{formatAmount(expectedAmount)}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Montant reçu (F CFA) *</label>
              <input
                type="number"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(parseInt(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {diff !== 0 && (
              <div className={`px-3 py-2 rounded text-sm ${diff < 0 ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}>
                Écart: {diff > 0 ? '+' : ''}{formatAmount(diff)} {diff < 0 ? '— montant manquant' : '— surplus'}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optionnel)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Explication d'un écart, remarque..."
              />
            </div>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-3 rounded-lg">
              Code envoyé à votre email — valide 10 minutes
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Code de vérification (6 chiffres)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
                className="w-full border-2 rounded-lg px-4 py-3 text-3xl font-bold text-center tracking-widest focus:outline-none focus:border-blue-500"
                placeholder="——————"
              />
            </div>
            <button
              onClick={() => { setStep('form'); setOtpCode(''); setError('') }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Retour
            </button>
          </div>
        )}

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Annuler</button>
          {step === 'form' ? (
            <button
              onClick={requestOtp}
              disabled={sending || receivedAmount < 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? 'Envoi...' : 'Envoyer le code de vérification'}
            </button>
          ) : (
            <button
              onClick={confirmWithOtp}
              disabled={confirm.isPending || otpCode.length !== 6}
              className="px-4 py-2 text-sm bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50"
            >
              {confirm.isPending ? 'Enregistrement...' : 'Confirmer le versement'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

import { getStoredUser } from '../lib/auth'

export function CaissePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [confirming, setConfirming] = useState<any | null>(null)
  const qc = useQueryClient()
  const user = getStoredUser()
  const isReadOnly = user?.role === 'SUPER_ADMIN'

  const { data: pending, isLoading: loadingPending } = useQuery({
    queryKey: ['handovers-pending', date],
    queryFn: () => api.get('/handovers/pending', { params: { date } }).then((r) => r.data),
  })

  const { data: confirmed, isLoading: loadingConfirmed } = useQuery({
    queryKey: ['handovers-confirmed', date],
    queryFn: () => api.get('/handovers', { params: { date, status: 'CONFIRMED', page_size: 50 } }).then((r) => r.data),
  })

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ['handovers-pending', date] })
    qc.invalidateQueries({ queryKey: ['handovers-confirmed', date] })
    qc.invalidateQueries({ queryKey: ['dashboard-admin'] })
  }

  const pendingRows = (pending ?? []).filter((r: any) => !r.handover_status || r.handover_status === 'OPEN')
  const confirmedRows = confirmed?.data ?? []

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Caisse</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        />
      </div>

      {confirming && !isReadOnly && (
        <ConfirmModal
          collector={confirming}
          expectedAmount={confirming.expected_amount}
          businessDate={date}
          onClose={() => setConfirming(null)}
          onConfirmed={refetch}
        />
      )}

      {/* Pending section */}
      <div className="mb-8">
        <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
          À verser
          {pendingRows.length > 0 && (
            <span className="ml-1 bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {pendingRows.length}
            </span>
          )}
        </h3>
        {loadingPending ? (
          <p className="text-sm text-gray-400">Chargement...</p>
        ) : pendingRows.length === 0 ? (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
            Tous les collecteurs ont versé pour cette date.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Collecteur</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Encaissements</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Montant attendu</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingRows.map((row: any) => (
                  <tr key={row.collector_id}>
                    <td className="px-4 py-3 font-medium">{row.first_name} {row.last_name}</td>
                    <td className="px-4 py-3 text-gray-600">{row.collections_count} encaissement{row.collections_count > 1 ? 's' : ''}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatAmount(row.expected_amount)}</td>
                    <td className="px-4 py-3 text-right">
                      {isReadOnly ? (
                        <span className="px-3 py-1.5 text-xs bg-gray-100 text-gray-400 rounded font-medium">
                          Lecture seule
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirming(row)}
                          className="px-3 py-1.5 text-xs bg-green-700 text-white rounded hover:bg-green-800 font-medium"
                        >
                          Confirmer versement
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmed section */}
      <div>
        <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          Versements confirmés
        </h3>
        {loadingConfirmed ? (
          <p className="text-sm text-gray-400">Chargement...</p>
        ) : confirmedRows.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun versement confirmé pour cette date.</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Collecteur</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Attendu</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reçu</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Écart</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Confirmé par</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Heure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {confirmedRows.map((h: any) => {
                  const diff = (h.receivedAmount ?? 0) - h.expectedAmount
                  return (
                    <tr key={h.id}>
                      <td className="px-4 py-3 font-medium">{h.collector?.firstName} {h.collector?.lastName}</td>
                      <td className="px-4 py-3">{formatAmount(h.expectedAmount)}</td>
                      <td className="px-4 py-3 font-semibold">{formatAmount(h.receivedAmount ?? 0)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${diff === 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                          {diff === 0 ? '✓ OK' : `${diff > 0 ? '+' : ''}${formatAmount(diff)}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{h.cashier?.firstName} {h.cashier?.lastName}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{h.confirmedAt ? formatDateTime(h.confirmedAt) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-gray-50 border-t text-sm">
              <span className="font-semibold">Total versé: </span>
              <span className="font-bold text-green-700">
                {formatAmount(confirmedRows.reduce((s: number, h: any) => s + (h.receivedAmount ?? 0), 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
