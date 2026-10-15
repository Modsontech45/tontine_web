import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../lib/api'

export function ZonesPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['zones'],
    queryFn: () => api.get('/zones').then((r) => r.data),
  })

  const create = useMutation({
    mutationFn: () => api.post('/zones', { name, description }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['zones'] }); setName(''); setDescription('') },
  })

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Zones</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nom de la zone</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-3 py-1.5 text-sm" placeholder="Ex: Agoè" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="border rounded px-3 py-1.5 text-sm" placeholder="Optionnel" />
        </div>
        <button onClick={() => create.mutate()} disabled={!name} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
          Créer
        </button>
      </div>
      {isLoading ? <p className="text-gray-500">Chargement...</p> : (
        <ul className="space-y-2">
          {data?.data?.map((zone: { id: string; name: string; description: string }) => (
            <li key={zone.id} className="bg-white rounded-lg border border-gray-100 px-4 py-3 flex justify-between items-center">
              <span className="font-medium text-gray-900">{zone.name}</span>
              <span className="text-sm text-gray-500">{zone.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
