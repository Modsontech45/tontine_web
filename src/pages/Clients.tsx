import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { formatAmount, STATUS_LABELS } from '../lib/format'

export function ClientsPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['clients', q, status, page],
    queryFn: () => api.get('/clients', { params: { q: q || undefined, status: status || undefined, page, page_size: 25 } }).then((r) => r.data),
  })

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Clients</h2>

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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Mises</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((c: {
                  id: string; carnetNumber: string; firstName: string; lastName: string;
                  phone: string; status: string;
                  collector?: { firstName: string; lastName: string };
                  cycles?: Array<{ stakeAmount: number; boxesFilled: number }>;
                }) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-blue-700">{c.carnetNumber}</td>
                    <td className="px-4 py-3 font-medium">{c.firstName} {c.lastName}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.collector?.firstName} {c.collector?.lastName}</td>
                    <td className="px-4 py-3">{c.cycles?.[0] ? formatAmount(c.cycles[0].stakeAmount) : '—'}</td>
                    <td className="px-4 py-3">
                      {c.cycles?.[0] ? (
                        <div className="flex gap-0.5">
                          {Array.from({ length: Math.min(c.cycles[0].boxesFilled, 10) }).map((_, i) => (
                            <div key={i} className="w-2 h-2 bg-green-500 rounded-sm" />
                          ))}
                          {c.cycles[0].boxesFilled > 10 && <span className="text-xs text-gray-500">+{c.cycles[0].boxesFilled - 10}</span>}
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
              <button disabled={data?.data?.length < 25} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">→</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
