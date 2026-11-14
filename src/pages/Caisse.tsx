import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../lib/api'
import { formatAmount, formatDateTime } from '../lib/format'

const OTP_VERIFIED_KEY = 'handover_otp_verified_at'
const OTP_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function isOtpVerifiedRecently(): boolean {
  try {
    const ts = localStorage.getItem(OTP_VERIFIED_KEY)
    return !!ts && Date.now() - parseInt(ts) < OTP_WINDOW_MS
  } catch { return false }
}

function markOtpVerified() {
  try { localStorage.setItem(OTP_VERIFIED_KEY, Date.now().toString()) } catch {}
}

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
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form')
  const [otpCode, setOtpCode] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const alreadyVerified = isOtpVerifiedRecently()
  const diff = receivedAmount - expectedAmount

  const requestOtp = async () => {
    setSending(true)
    setError('')
    try {
      await api.post('/otp/request', { purpose: 'CONFIRM_HANDOVER' })
      setStep('otp')
    } catch {
      // Email not configured or unavailable — confirm directly without OTP
      confirmDirect()
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
    onSuccess: () => { setStep('success'); onConfirmed(); setTimeout(onClose, 1800) },
    onError: (err: any) => setError(err?.response?.data?.error?.message ?? 'Erreur'),
  })

  const confirmDirect = () => confirm.mutate(undefined)
  const confirmWithOtp = () => {
    if (otpCode.length !== 6) { setError('Entrez le code à 6 chiffres'); return }
    setError('')
    markOtpVerified()
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
              Code envoyé à votre email — copiez-le et collez-le ici, valide 10 minutes
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Code de vérification (6 chiffres)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setOtpCode(val)
                  // Auto-confirm as soon as 6 digits are entered (paste or typed)
                  if (val.length === 6) {
                    setError('')
                    markOtpVerified()
                    confirm.mutate(val)
                  }
                }}
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

        {step === 'success' && (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <p className="text-base font-semibold text-green-800">Versement confirmé !</p>
            <p className="text-sm text-gray-500">{formatAmount(receivedAmount)} enregistré pour {collector.first_name} {collector.last_name}</p>
          </div>
        )}

        {error && step !== 'success' && <p className="text-red-600 text-sm mt-3">{error}</p>}

        {step !== 'success' && (
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Annuler</button>
            {step === 'form' ? (
              alreadyVerified ? (
                <button
                  onClick={confirmDirect}
                  disabled={confirm.isPending || receivedAmount < 0}
                  className="px-4 py-2 text-sm bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50"
                >
                  {confirm.isPending ? 'Enregistrement...' : 'Confirmer le versement'}
                </button>
              ) : (
                <button
                  onClick={requestOtp}
                  disabled={sending || confirm.isPending || receivedAmount < 0}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending || confirm.isPending ? 'Confirmation...' : 'Envoyer le code de vérification'}
                </button>
              )
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
        )}
      </div>
    </div>
  )
}

import { getStoredUser } from '../lib/auth'

function CollectorAvatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
      <span className="text-white text-xs font-bold">{initials}</span>
    </div>
  )
}

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

  const pendingRows = (pending ?? []).filter((r: any) =>
    !r.handover_id || r.handover_status !== 'CONFIRMED' || r.expected_amount > (r.received_amount ?? 0)
  )
  const confirmedRows = confirmed?.data ?? []

  const totalPending = pendingRows.reduce((s: number, r: any) => s + (r.expected_amount - (r.received_amount ?? 0)), 0)
  const totalConfirmed = confirmedRows.reduce((s: number, h: any) => s + (h.receivedAmount ?? 0), 0)

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().slice(0, 10)) }
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().slice(0, 10)) }
  const isToday = date === new Date().toISOString().slice(0, 10)
  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="max-w-4xl mx-auto">
      {confirming && !isReadOnly && (
        <ConfirmModal
          collector={confirming}
          expectedAmount={confirming._outstanding ?? confirming.expected_amount}
          businessDate={date}
          onClose={() => setConfirming(null)}
          onConfirmed={refetch}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Caisse</h2>
          <p className="text-sm text-gray-500 capitalize mt-0.5">{displayDate}</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1 py-1 shadow-sm w-fit">
          <button onClick={prevDay} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="text-sm font-medium text-gray-700 bg-transparent border-none outline-none cursor-pointer px-1" />
          <button onClick={nextDay} disabled={isToday} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">En attente</p>
          <p className="text-2xl font-bold text-orange-600">{formatAmount(totalPending)}</p>
          <p className="text-xs text-gray-400 mt-1">{pendingRows.length} collecteur{pendingRows.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Versé aujourd'hui</p>
          <p className="text-2xl font-bold text-green-700">{formatAmount(totalConfirmed)}</p>
          <p className="text-xs text-gray-400 mt-1">{confirmedRows.length} versement{confirmedRows.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total collecté</p>
          <p className="text-2xl font-bold text-gray-800">{formatAmount(totalPending + totalConfirmed)}</p>
          <p className="text-xs text-gray-400 mt-1">{pendingRows.length + confirmedRows.length} collecteurs actifs</p>
        </div>
      </div>

      {/* Pending section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-orange-400 rounded-full" />
          <h3 className="text-base font-semibold text-gray-800">À verser</h3>
          {pendingRows.length > 0 && (
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingRows.length}</span>
          )}
        </div>

        {loadingPending ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            Chargement...
          </div>
        ) : pendingRows.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
            </div>
            <div>
              <p className="font-semibold text-green-800 text-sm">Tous les collecteurs ont versé</p>
              <p className="text-green-600 text-xs mt-0.5">Aucun versement en attente pour cette date.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRows.map((row: any) => {
              const outstanding = row.expected_amount - (row.received_amount ?? 0)
              return (
                <div key={row.collector_id} className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 flex items-center gap-4">
                  <CollectorAvatar firstName={row.first_name} lastName={row.last_name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{row.first_name} {row.last_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{row.collections_count} encaissement{row.collections_count !== 1 ? 's' : ''} · Total {formatAmount(row.expected_amount)}</p>
                  </div>
                  <div className="text-right mr-2">
                    <p className="text-xs text-gray-500">Reste à verser</p>
                    <p className="text-lg font-bold text-orange-600">{formatAmount(outstanding)}</p>
                  </div>
                  {isReadOnly ? (
                    <span className="text-xs bg-gray-100 text-gray-400 px-3 py-1.5 rounded-lg font-medium flex-shrink-0">Lecture seule</span>
                  ) : (
                    <button
                      onClick={() => setConfirming({ ...row, _outstanding: outstanding })}
                      className="flex-shrink-0 px-4 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 font-medium transition-colors shadow-sm"
                    >
                      Confirmer
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirmed section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-green-500 rounded-full" />
          <h3 className="text-base font-semibold text-gray-800">Versements confirmés</h3>
          {confirmedRows.length > 0 && (
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{confirmedRows.length}</span>
          )}
        </div>

        {loadingConfirmed ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            Chargement...
          </div>
        ) : confirmedRows.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Aucun versement confirmé pour cette date.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Collecteur</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Attendu</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reçu</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Écart</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Par</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Heure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {confirmedRows.map((h: any) => {
                  const diff = (h.receivedAmount ?? 0) - h.expectedAmount
                  return (
                    <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <CollectorAvatar firstName={h.collector?.firstName ?? ''} lastName={h.collector?.lastName ?? ''} />
                          <span className="font-medium text-gray-900">{h.collector?.firstName} {h.collector?.lastName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-gray-600">{formatAmount(h.expectedAmount)}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-gray-900">{formatAmount(h.receivedAmount ?? 0)}</td>
                      <td className="px-4 py-3.5 text-center">
                        {diff === 0 ? (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                            OK
                          </span>
                        ) : (
                          <span className={`text-xs font-bold ${diff < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                            {diff > 0 ? '+' : ''}{formatAmount(diff)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs hidden sm:table-cell">{h.cashier?.firstName} {h.cashier?.lastName}</td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs text-right hidden sm:table-cell">{h.confirmedAt ? formatDateTime(h.confirmedAt) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-100 bg-gray-50/50">
                  <td className="px-5 py-3 font-semibold text-gray-700 text-sm" colSpan={2}>Total versé</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700 text-base">{formatAmount(totalConfirmed)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
