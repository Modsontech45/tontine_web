import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function SettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  })

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Paramètres</h2>
      {isLoading ? <p className="text-gray-500">Chargement...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(data ?? {}).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{key}</dt>
                <dd className="text-sm text-gray-900 mt-1">{JSON.stringify(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}
