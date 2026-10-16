import { useQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { formatAmount, STATUS_LABELS } from '../lib/format'
import { ACTIVITY_OPTIONS } from '../lib/activityOptions'

// ── Create client modal ────────────────────────────────────────────────────

function CreateClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: (carnet: string) => void }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '+228', address_text: '', activity: '',
    stake_amount: 500,
    cycle_start: new Date().toISOString().slice(0, 7) + '-01',
    cycle_end: (() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d.toISOString().slice(0, 10) })(),
  })
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [gps, setGps] = useState<{ lat: number; lng: number; acc: number } | null>(null)
  const [error, setError] = useState('')

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const captureGps = () => {
    setGpsStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }); setGpsStatus('ok') },
      () => setGpsStatus('error'),
      { timeout: 15000, enableHighAccuracy: true }
    )
  }

  const create = useMutation({
    mutationFn: () => {
      if (!gps) throw new Error('GPS requis')
      const id = crypto.randomUUID()
      const cycleId = crypto.randomUUID()
      return api.post('/clients', {
        id, first_name: form.first_name, last_name: form.last_name,
        phone: form.phone, address_text: form.address_text,
        activity: form.activity || undefined,
        latitude: gps.lat, longitude: gps.lng, gps_accuracy_m: gps.acc,
        registered_at: new Date().toISOString(),
        sms_opt_out: false,
        cycle_id: cycleId, stake_amount: form.stake_amount,
        cycle_start: form.cycle_start, cycle_end: form.cycle_end, max_boxes: 31,
      })
    },
    onSuccess: (res) => {
      const carnet = res.data?.client?.carnetNumber ?? res.data?.client?.carnet_number ?? '?'
      onCreated(carnet)
      onClose()
    },
    onError: (err: any) => setError(err?.response?.data?.error?.message ?? err.message ?? 'Erreur'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Créer un client</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
              <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
              <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone *</label>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+228XXXXXXXX" className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
            <input value={form.address_text} onChange={(e) => set('address_text', e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Activité / Secteur</label>
            <select value={form.activity} onChange={(e) => set('activity', e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Sélectionner —</option>
              {ACTIVITY_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Position GPS *</label>
            <button onClick={captureGps} disabled={gpsStatus === 'loading'} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">
              {gpsStatus === 'loading' ? 'Acquisition...' : gpsStatus === 'ok' ? `✓ ${gps!.lat.toFixed(4)}, ${gps!.lng.toFixed(4)} (±${gps!.acc.toFixed(0)} m)` : 'Capturer GPS'}
            </button>
            {gpsStatus === 'error' && <p className="text-xs text-red-500 mt-1">GPS indisponible</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mise (F CFA) *</label>
              <select value={form.stake_amount} onChange={(e) => set('stake_amount', parseInt(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm">
                {[100, 200, 250, 500, 1000, 2000, 5000].map((a) => <option key={a} value={a}>{a} F</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Début cycle</label>
              <input type="date" value={form.cycle_start} onChange={(e) => set('cycle_start', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fin cycle</label>
              <input type="date" value={form.cycle_end} onChange={(e) => set('cycle_end', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
        </div>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">Annuler</button>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending || !form.first_name || !form.last_name || !form.phone || gpsStatus !== 'ok'}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {create.isPending ? 'Création...' : 'Créer le client'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export function ClientsPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['clients', q, status, page],
    queryFn: () => api.get('/clients', { params: { q: q || undefined, status: status || undefined, page, page_size: 25 } }).then((r) => r.data),
  })

  const handleCreated = (carnet: string) => {
    setToast(`Client créé — Carnet: ${carnet}`)
    setTimeout(() => setToast(''), 5000)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Clients</h2>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Créer un client
        </button>
      </div>

      {toast && <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2 rounded">{toast}</div>}

      {showCreate && <CreateClientModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}

      <div className="flex gap-3 mb-4">
        <input
          value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }}
          placeholder="Rechercher (nom, carnet, téléphone)..."
          className="border rounded-md px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="border rounded-md px-3 py-1.5 text-sm">
          <option value="">Tous statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="SUSPENDED">Suspendu</option>
          <option value="CLOSED">Clôturé</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Carnet</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Téléphone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Collecteur</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Mise</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((c: any) => (
                  <tr
                    key={c.id}
                    className="hover:bg-blue-50 cursor-pointer"
                    onClick={() => navigate('/clients/' + c.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-blue-700">{c.carnetNumber}</td>
                    <td className="px-4 py-3 font-medium">{c.firstName} {c.lastName}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.collector?.firstName} {c.collector?.lastName}</td>
                    <td className="px-4 py-3">
                      {c.cycles?.[0] ? (
                        <div>
                          <div className="text-sm">{formatAmount(c.cycles[0].stakeAmount)}</div>
                          <div className="font-bold text-sm text-gray-800">{c.cycles[0].boxesFilled}/{c.cycles[0].maxBoxes ?? 31}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${c.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>{data?.total ?? 0} clients</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">←</button>
              <span>Page {page}</span>
              <button disabled={(data?.data?.length ?? 0) < 25} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">→</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
