import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../lib/api'
import { STATUS_LABELS } from '../lib/format'

export function StickersPage() {
  const qc = useQueryClient()
  const [fromNum, setFromNum] = useState('')
  const [toNum, setToNum] = useState('')
  const [assignCollector, setAssignCollector] = useState('')
  const [assignFrom, setAssignFrom] = useState('')
  const [assignTo, setAssignTo] = useState('')
  const [batchMsg, setBatchMsg] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data: collectors } = useQuery({
    queryKey: ['users', 'COLLECTOR'],
    queryFn: () => api.get('/users', { params: { role: 'COLLECTOR', page_size: 100 } }).then((r) => r.data),
  })

  const collectorMap: Record<string, string> = {}
  for (const u of collectors?.data ?? []) {
    collectorMap[u.id] = `${u.firstName} ${u.lastName}`
  }

  const { data: stickers, isLoading } = useQuery({
    queryKey: ['stickers', statusFilter, page],
    queryFn: () => api.get('/stickers', { params: { status: statusFilter || undefined, page, page_size: 50 } }).then((r) => r.data),
  })

  const createBatch = useMutation({
    mutationFn: () => api.post('/sticker-batches', { from_number: parseInt(fromNum), to_number: parseInt(toNum) }, { responseType: 'blob' }),
    onSuccess: (res) => {
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url; a.download = 'stickers.pdf'; a.click()
      setBatchMsg(`Lot créé (TP-${fromNum.padStart(6,'0')} → TP-${toNum.padStart(6,'0')}). PDF téléchargé.`)
      qc.invalidateQueries({ queryKey: ['stickers'] })
    },
    onError: () => setBatchMsg('Erreur lors de la création du lot'),
  })

  const assign = useMutation({
    mutationFn: () => api.post('/stickers/assign', { collector_id: assignCollector, from_number: parseInt(assignFrom), to_number: parseInt(assignTo) }),
    onSuccess: () => { setBatchMsg('Carnets assignés avec succès'); qc.invalidateQueries({ queryKey: ['stickers'] }) },
    onError: () => setBatchMsg('Erreur lors de l\'assignation'),
  })

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Carnets / Stickers</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-medium text-gray-900 mb-3">Créer un lot de carnets</h3>
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">N° début</label>
              <input type="number" value={fromNum} onChange={(e) => setFromNum(e.target.value)} className="border rounded px-2 py-1.5 text-sm w-24" placeholder="201" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">N° fin</label>
              <input type="number" value={toNum} onChange={(e) => setToNum(e.target.value)} className="border rounded px-2 py-1.5 text-sm w-24" placeholder="250" />
            </div>
            <button
              onClick={() => createBatch.mutate()}
              disabled={!fromNum || !toNum || createBatch.isPending}
              className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {createBatch.isPending ? '...' : 'Créer + PDF'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-medium text-gray-900 mb-3">Assigner à un collecteur</h3>
          <div className="flex gap-2 items-end flex-wrap">
            <select value={assignCollector} onChange={(e) => setAssignCollector(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
              <option value="">Collecteur...</option>
              {collectors?.data?.map((u: { id: string; firstName: string; lastName: string }) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
            <input type="number" value={assignFrom} onChange={(e) => setAssignFrom(e.target.value)} className="border rounded px-2 py-1.5 text-sm w-20" placeholder="début" />
            <input type="number" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="border rounded px-2 py-1.5 text-sm w-20" placeholder="fin" />
            <button
              onClick={() => assign.mutate()}
              disabled={!assignCollector || !assignFrom || !assignTo || assign.isPending}
              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              Assigner
            </button>
          </div>
        </div>
      </div>

      {batchMsg && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded mb-4">{batchMsg}</p>}

      <div className="flex items-center gap-3 mb-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="AVAILABLE">Disponible</option>
          <option value="ASSIGNED">Assigné</option>
          <option value="USED">Utilisé</option>
        </select>
        <span className="text-sm text-gray-500">{stickers?.total ?? 0} carnets</span>
      </div>

      {isLoading ? <p className="text-gray-500">Chargement...</p> : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">N° Carnet</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Collecteur assigné</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stickers?.data?.map((s: { carnetNumber: string; status: string; assignedCollectorId: string }) => (
                  <tr key={s.carnetNumber} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{s.carnetNumber}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${s.status === 'USED' ? 'bg-gray-100 text-gray-600' : s.status === 'ASSIGNED' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
                        {STATUS_LABELS[s.status] ?? s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-700">
                      {s.assignedCollectorId ? (collectorMap[s.assignedCollectorId] ?? s.assignedCollectorId.slice(0, 8) + '...') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3 text-sm">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">← Précédente</button>
            <span className="text-gray-500">Page {page}</span>
            <button disabled={(stickers?.data?.length ?? 0) < 50} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Suivante →</button>
          </div>
        </>
      )}
    </div>
  )
}
