import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../lib/api'
import { ROLE_LABELS } from '../lib/format'

interface UserRow {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string
  role: string
  isActive: boolean
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '+228', email: '', role: 'COLLECTOR', password: '', pin: '' })
  const [error, setError] = useState('')

  const isCollector = form.role === 'COLLECTOR'

  const create = useMutation({
    mutationFn: () => {
      const body: Record<string, string> = {
        role: form.role, first_name: form.first_name, last_name: form.last_name, phone: form.phone,
      }
      if (form.email) body.email = form.email
      if (isCollector) body.pin = form.pin
      else body.password = form.password
      return api.post('/users', body)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose() },
    onError: (err: any) => setError(err?.response?.data?.error?.message ?? 'Erreur de création'),
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const canSubmit = !create.isPending && !!form.first_name && !!form.last_name && !!form.phone &&
    (isCollector ? form.pin.length === 6 : form.password.length >= 8)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Créer un utilisateur</h3>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Email <span className="text-gray-400">(optionnel — reçoit un email de bienvenue)</span></label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="prenom@example.com" className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rôle *</label>
            <select value={form.role} onChange={(e) => set('role', e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm">
              <option value="COLLECTOR">Collecteur</option>
              <option value="ADMIN">Administrateur</option>
              <option value="CONTROLLER">Contrôleur</option>
              <option value="CASHIER">Caissier</option>
            </select>
          </div>
          {isCollector ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">PIN (6 chiffres) *</label>
              <input
                type="password" inputMode="numeric" maxLength={6}
                value={form.pin} onChange={(e) => set('pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">Le collecteur utilisera ce PIN sur l'application mobile.</p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe (min. 8 caractères) *</label>
              <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
        </div>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">Annuler</button>
          <button
            onClick={() => create.mutate()}
            disabled={!canSubmit}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {create.isPending ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ResetPinModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const resetPin = useMutation({
    mutationFn: () => api.post(`/users/${user.id}/reset-pin`, { pin }),
    onSuccess: onClose,
    onError: (err: any) => setError(err?.response?.data?.error?.message ?? 'Erreur'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xs">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-gray-900">Nouveau PIN</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <p className="text-sm text-gray-600 mb-3">{user.firstName} {user.lastName}</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6 chiffres"
          className="w-full border rounded px-3 py-2 text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
        />
        {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">Annuler</button>
          <button
            onClick={() => resetPin.mutate()}
            disabled={pin.length !== 6 || resetPin.isPending}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {resetPin.isPending ? '...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function UsersPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [resetPinUser, setResetPinUser] = useState<UserRow | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/deactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Utilisateurs</h2>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Créer un utilisateur
        </button>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
      {resetPinUser && <ResetPinModal user={resetPinUser} onClose={() => setResetPinUser(null)} />}

      {isLoading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Téléphone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rôle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data?.map((user: UserRow) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{user.firstName} {user.lastName}</td>
                  <td className="px-4 py-3 text-gray-600">{user.phone}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{user.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${user.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    {user.role === 'COLLECTOR' && (
                      <button
                        onClick={() => setResetPinUser(user)}
                        className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        Réinitialiser PIN
                      </button>
                    )}
                    {user.isActive && (
                      <button
                        onClick={() => deactivate.mutate(user.id)}
                        disabled={deactivate.isPending}
                        className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        Désactiver
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
  )
}
