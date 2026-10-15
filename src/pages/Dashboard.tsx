import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatAmount } from '../lib/format'

export function DashboardPage() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  })

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Tableau de bord</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <KpiCard label="Société" value={settings?.company_name ?? '—'} />
        <KpiCard label="Mise minimum" value={settings ? formatAmount(settings.stake_min) : '—'} />
        <KpiCard label="Mise maximum" value={settings ? formatAmount(settings.stake_max) : '—'} />
      </div>
      <p className="text-gray-500 text-sm">
        Bienvenue sur le tableau de bord de Tontine Prospera. Les modules seront ajoutés au fil des jalons.
      </p>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
