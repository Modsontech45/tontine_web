import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../lib/api'

function parseValue(raw: string, original: unknown): unknown {
  if (typeof original === 'boolean') return raw === 'true'
  if (typeof original === 'number') {
    const n = Number(raw)
    return isNaN(n) ? original : n
  }
  return raw
}

function SettingRow({ name, value }: { name: string; value: unknown }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)

  const save = useMutation({
    mutationFn: () => api.patch(`/settings/${name}`, { value: parseValue(draft, value) }),
    onSuccess: () => {
      setEditing(false)
      setFlash({ ok: true, msg: 'Enregistré' })
      qc.invalidateQueries({ queryKey: ['settings'] })
      setTimeout(() => setFlash(null), 2500)
    },
    onError: (err: any) => {
      setFlash({ ok: false, msg: err?.response?.data?.error?.message ?? 'Erreur' })
      setTimeout(() => setFlash(null), 4000)
    },
  })

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{name}</dt>
      <dd className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') save.mutate(); if (e.key === 'Escape') setEditing(false) }}
              className="border rounded px-2 py-1 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={() => save.mutate()} disabled={save.isPending} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
              {save.isPending ? '...' : 'OK'}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-800">Annuler</button>
          </>
        ) : (
          <>
            <span className="text-sm text-gray-900">{JSON.stringify(value)}</span>
            <button onClick={() => { setDraft(String(value)); setEditing(true) }} className="text-gray-400 hover:text-blue-600 ml-1" title="Modifier">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110.414 16H8v-2.414a2 2 0 01.586-1.414z" /></svg>
            </button>
          </>
        )}
        {flash && <span className={`text-xs ml-1 ${flash.ok ? 'text-green-600' : 'text-red-600'}`}>{flash.msg}</span>}
      </dd>
    </div>
  )
}

export function SettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  })

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Paramètres</h2>
      {isLoading ? <p className="text-gray-500">Chargement...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-xl">
          <dl>
            {Object.entries(data ?? {}).map(([key, value]) => (
              <SettingRow key={key} name={key} value={value} />
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}
