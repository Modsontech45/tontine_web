import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../lib/api'
import { formatAmount, formatDate, formatDateTime, STATUS_LABELS } from '../lib/format'
import { getStoredUser } from '../lib/auth'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = getStoredUser()
  const canManageCycles = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'CONTROLLER'

  const [showNewCycleForm, setShowNewCycleForm] = useState(false)
  const [newCycleForm, setNewCycleForm] = useState({
    stake_amount: 500,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: (() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d.toISOString().slice(0, 10) })(),
  })
  const [cycleError, setCycleError] = useState('')

  const closeCycleMut = useMutation({
    mutationFn: (cycleId: string) => api.post(`/cycles/${cycleId}/close`, { reason: 'Cycle complété' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client', id] }),
    onError: (e: any) => alert(e?.response?.data?.error?.message ?? 'Erreur lors de la clôture'),
  })

  const createCycleMut = useMutation({
    mutationFn: () => api.post(`/clients/${id}/cycles`, newCycleForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client', id] }); setShowNewCycleForm(false); setCycleError('') },
    onError: (e: any) => setCycleError(e?.response?.data?.error?.message ?? 'Erreur lors de la création'),
  })

  const [payingOutCycleId, setPayingOutCycleId] = useState<string | null>(null)
  const [payoutNotes, setPayoutNotes] = useState('')
  const [carnetVerified, setCarnetVerified] = useState(false)
  const payoutMut = useMutation({
    mutationFn: (cycleId: string) => api.post(`/cycles/${cycleId}/payout`, { carnet_verified: carnetVerified, notes: payoutNotes || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client', id] }); setPayingOutCycleId(null); setCarnetVerified(false); setPayoutNotes('') },
    onError: (e: any) => alert(e?.response?.data?.error?.message ?? 'Erreur lors du remboursement'),
  })

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => api.get(`/clients/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  const { data: qrData, isLoading: qrLoading } = useQuery({
    queryKey: ['client-qr', id],
    queryFn: () => api.get(`/clients/${id}/qr`).then((r) => r.data),
    enabled: !!id && !!client,
  })

  const openCycle = client?.cycles?.find((c: any) => c.status === 'OPEN')
  const allCollections = openCycle?.collections ?? []

  const downloadQr = () => {
    if (!qrData?.qr_image) return
    const link = document.createElement('a')
    link.href = qrData.qr_image
    link.download = `QR_${qrData.carnet_number ?? 'carnet'}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const printQr = () => {
    if (!qrData?.qr_image) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!doctype html><html><head><title>QR ${qrData.carnet_number}</title>
    <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;padding:40px}
    img{width:200px;height:200px} p{margin:6px 0;font-size:14px} strong{font-size:16px}</style></head>
    <body><img src="${qrData.qr_image}" /><p><strong>${qrData.carnet_number}</strong></p>
    <p>${client?.firstName} ${client?.lastName}</p></body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg">Client introuvable</p>
        <button onClick={() => navigate('/clients')} className="mt-4 text-blue-600 hover:underline text-sm">← Retour</button>
      </div>
    )
  }

  const maxBoxes = openCycle?.maxBoxes ?? 31
  const filled = openCycle?.boxesFilled ?? 0
  const progressPct = Math.round((filled / maxBoxes) * 100)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/clients')} className="text-gray-400 hover:text-gray-700 p-1 rounded">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{client.firstName} {client.lastName}</h2>
          <p className="text-sm font-mono text-blue-700">{client.carnetNumber}</p>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${client.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {STATUS_LABELS[client.status] ?? client.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: profile + QR */}
        <div className="space-y-6">
          {/* Profile card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Informations</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Téléphone</span>
                <span className="font-medium">{client.phone}</span>
              </div>
              {client.phoneAlt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tél. alt</span>
                  <span className="font-medium">{client.phoneAlt}</span>
                </div>
              )}
              {client.collector && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Collecteur</span>
                  <span className="font-medium">{client.collector.firstName} {client.collector.lastName}</span>
                </div>
              )}
              {client.zone && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Zone</span>
                  <span className="font-medium">{client.zone.name}</span>
                </div>
              )}
              {client.addressText && (
                <div>
                  <span className="text-gray-500">Adresse</span>
                  <p className="font-medium mt-0.5">{client.addressText}</p>
                </div>
              )}
              {client.latitude != null && client.longitude != null && (
                <a
                  href={`https://www.google.com/maps?q=${client.latitude},${client.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline mt-1"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  Voir sur Google Maps
                </a>
              )}
            </div>
          </div>

          {/* QR Code card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Code QR Carnet</h3>
            {qrLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
            ) : qrData ? (
              <div className="flex flex-col items-center gap-3">
                <img src={qrData.qr_image} alt="QR Code" className="w-40 h-40 border border-gray-200 rounded" />
                <p className="text-xs font-mono text-gray-600">{qrData.carnet_number}</p>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={downloadQr}
                    className="flex-1 text-xs border border-blue-300 text-blue-700 py-1.5 rounded hover:bg-blue-50"
                  >
                    Télécharger PNG
                  </button>
                  <button
                    onClick={printQr}
                    className="flex-1 text-xs border border-gray-300 text-gray-700 py-1.5 rounded hover:bg-gray-50"
                  >
                    Imprimer
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Indisponible</p>
            )}
          </div>
        </div>

        {/* Right column: cycle + collections */}
        <div className="md:col-span-2 space-y-6">
          {/* Cycle progress card */}
          {openCycle ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Cycle en cours</h3>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-900">{filled}<span className="text-base font-normal text-gray-400">/{maxBoxes}</span></span>
                  {canManageCycles && filled >= maxBoxes && (
                    <button
                      onClick={() => { if (window.confirm('Clôturer ce cycle complet ?')) closeCycleMut.mutate(openCycle.id) }}
                      disabled={closeCycleMut.isPending}
                      className="text-xs px-3 py-1.5 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                    >
                      {closeCycleMut.isPending ? '...' : 'Clôturer'}
                    </button>
                  )}
                </div>
              </div>
              {filled >= maxBoxes && (
                <div className="mb-3 px-3 py-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800 font-medium">
                  Ce cycle est complet (31/31 mises). Clôturez-le pour en ouvrir un nouveau.
                </div>
              )}
              <div className="w-full bg-gray-100 rounded-full h-3 mb-4">
                <div className={`h-3 rounded-full transition-all ${filled >= maxBoxes ? 'bg-orange-400' : 'bg-green-500'}`} style={{ width: `${Math.min(100, progressPct)}%` }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Mise journalière</p>
                  <p className="font-semibold">{formatAmount(openCycle.stakeAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total payé</p>
                  <p className="font-semibold text-green-700">{formatAmount(openCycle.totalPaid)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Objectif</p>
                  <p className="font-semibold">{formatAmount(openCycle.stakeAmount * maxBoxes)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Fin de cycle</p>
                  <p className="font-semibold">{openCycle.endDate ? formatDate(openCycle.endDate) : '—'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-500">Aucun cycle ouvert</span>
                {canManageCycles && !showNewCycleForm && (
                  <button onClick={() => setShowNewCycleForm(true)} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
                    + Nouveau cycle
                  </button>
                )}
              </div>
              {showNewCycleForm && (
                <div className="space-y-3 mt-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Mise (F)</label>
                      <select value={newCycleForm.stake_amount} onChange={e => setNewCycleForm(f => ({ ...f, stake_amount: parseInt(e.target.value) }))} className="w-full border rounded px-2 py-1.5 text-sm">
                        {[100, 200, 250, 500, 600, 1000, 1500, 2000, 5000].map(a => <option key={a} value={a}>{a} F</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Début</label>
                      <input type="date" value={newCycleForm.start_date} onChange={e => setNewCycleForm(f => ({ ...f, start_date: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Fin</label>
                      <input type="date" value={newCycleForm.end_date} onChange={e => setNewCycleForm(f => ({ ...f, end_date: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                    </div>
                  </div>
                  {cycleError && <p className="text-red-600 text-xs">{cycleError}</p>}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setShowNewCycleForm(false); setCycleError('') }} className="text-xs px-3 py-1.5 border rounded text-gray-600 hover:bg-gray-50">Annuler</button>
                    <button onClick={() => createCycleMut.mutate()} disabled={createCycleMut.isPending} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                      {createCycleMut.isPending ? 'Création...' : 'Créer le cycle'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Collection history */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Historique des encaissements</h3>
            </div>
            {allCollections.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-500">Aucun encaissement sur ce cycle</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Date</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Montant</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allCollections.slice(0, 50).map((col: any) => (
                    <tr key={col.id}>
                      <td className="px-4 py-2 text-gray-600">{formatDateTime(col.collectedAt)}</td>
                      <td className="px-4 py-2 font-medium">{formatAmount(col.amount)}</td>
                      <td className="px-4 py-2">
                        {col.voidedAt ? (
                          <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">Annulé</span>
                        ) : (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">Validé</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Closed cycles awaiting payout */}
          {(client?.cycles ?? []).filter((c: any) => c.status === 'CLOSED' || c.status === 'PAID').length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Remboursements</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Cycle</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Total cotisé</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Commission</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Net à payer</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Statut</th>
                    {canManageCycles && <th className="px-4 py-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(client?.cycles ?? []).filter((c: any) => c.status === 'CLOSED' || c.status === 'PAID').map((c: any) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-medium">Cycle {c.cycleSequence}</td>
                      <td className="px-4 py-3">{formatAmount(c.totalPaid)}</td>
                      <td className="px-4 py-3 text-orange-700">{c.commissionAmount != null ? formatAmount(c.commissionAmount) : '—'}</td>
                      <td className="px-4 py-3 font-bold text-green-700">{c.netToPay != null ? formatAmount(c.netToPay) : '—'}</td>
                      <td className="px-4 py-3">
                        {c.status === 'PAID'
                          ? <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">Remboursé ✓</span>
                          : <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-medium">En attente</span>
                        }
                      </td>
                      {canManageCycles && (
                        <td className="px-4 py-3 text-right">
                          {c.status === 'CLOSED' && (
                            <button
                              onClick={() => { setPayingOutCycleId(c.id); setCarnetVerified(false); setPayoutNotes('') }}
                              className="text-xs px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800"
                            >
                              Rembourser le client
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payout confirmation modal */}
      {payingOutCycleId && (() => {
        const c = (client?.cycles ?? []).find((cy: any) => cy.id === payingOutCycleId)
        if (!c) return null
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-1">Rembourser le client</h3>
              <p className="text-sm text-gray-600 mb-4">{client.firstName} {client.lastName} — Cycle {c.cycleSequence}</p>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-500">Total cotisé</span>
                  <span className="font-semibold">{formatAmount(c.totalPaid)}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-500">Commission</span>
                  <span className="font-semibold text-orange-700">- {formatAmount(c.commissionAmount ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-600 font-medium">Net à remettre au client</span>
                  <span className="text-xl font-bold text-green-700">{formatAmount(c.netToPay ?? (c.totalPaid - (c.commissionAmount ?? 0)))}</span>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                <input type="checkbox" checked={carnetVerified} onChange={e => setCarnetVerified(e.target.checked)} className="w-4 h-4" />
                <span>J'ai vérifié le carnet du client</span>
              </label>
              <textarea
                placeholder="Notes (optionnel)"
                value={payoutNotes}
                onChange={e => setPayoutNotes(e.target.value)}
                rows={2}
                className="w-full border rounded px-3 py-2 text-sm mb-4"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setPayingOutCycleId(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Annuler</button>
                <button
                  onClick={() => payoutMut.mutate(payingOutCycleId)}
                  disabled={!carnetVerified || payoutMut.isPending}
                  className="px-4 py-2 text-sm bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50"
                >
                  {payoutMut.isPending ? 'Enregistrement...' : 'Confirmer le remboursement'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
