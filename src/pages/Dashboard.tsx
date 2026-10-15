import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { api } from '../lib/api'
import { formatAmount } from '../lib/format'

interface DashboardData {
  kpis: {
    activeClients: number; suspendedClients: number; closedClients: number
    todayAmount: number; todayCount: number
    monthAmount: number; monthCount: number
    openCycles: number; closedCycles: number; paidCycles: number; cancelledCycles: number
    pendingAlerts: number; pendingVoids: number
  }
  dailyCollections: Array<{ date: string; amount: number; count: number }>
  monthlyRevenue: Array<{ month: string; amount: number; count: number }>
  collectionsByZone: Array<{ zone: string; amount: number; count: number }>
  topCollectors: Array<{ name: string; amount: number; clients: number; count: number }>
  cycleBreakdown: Array<{ status: string; label: string; count: number }>
  alertsByType: Array<{ type: string; count: number }>
  stakeDistribution: Array<{ stake: number; clients: number }>
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']
const CYCLE_COLORS: Record<string, string> = {
  OPEN: '#10b981', CLOSED: '#f59e0b', PAID: '#6366f1', CANCELLED: '#ef4444',
}

function fmtShort(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M F`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k F`
  return `${v} F`
}

function AmountTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.dataKey === 'count' ? p.value : formatAmount(p.value)}
        </p>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard-admin'],
    queryFn: () => api.get('/dashboard/admin').then(r => r.data),
    refetchInterval: 60_000,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )
  if (error || !data) return (
    <div className="text-red-500 p-6">Impossible de charger le tableau de bord.</div>
  )

  const { kpis } = data

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">Tableau de bord</h2>

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Clients actifs"     value={kpis.activeClients}          color="indigo" />
        <KpiCard label="Collecté aujourd'hui" value={fmtShort(kpis.todayAmount)} sub={`${kpis.todayCount} opérations`} color="emerald" />
        <KpiCard label="Ce mois"            value={fmtShort(kpis.monthAmount)}   sub={`${kpis.monthCount} opérations`} color="violet" />
        <KpiCard label="Cycles ouverts"     value={kpis.openCycles}             color="sky" />
        <KpiCard label="Alertes ouvertes"   value={kpis.pendingAlerts}          color={kpis.pendingAlerts > 5 ? 'red' : 'amber'} />
        <KpiCard label="Annulations"        value={kpis.pendingVoids}           sub="en attente" color="orange" />
      </div>

      {/* ── Daily + Monthly charts ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Collectes journalières — 30 derniers jours">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.dailyCollections} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gDaily" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 11 }} interval={4} />
              <YAxis tickFormatter={v => fmtShort(v)} tick={{ fontSize: 11 }} width={58} />
              <Tooltip content={<AmountTooltip />} />
              <Area type="monotone" dataKey="amount" name="Montant" stroke="#6366f1" fill="url(#gDaily)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenus mensuels — 6 derniers mois">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthlyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => fmtShort(v)} tick={{ fontSize: 11 }} width={58} />
              <Tooltip content={<AmountTooltip />} />
              <Bar dataKey="amount" name="Montant" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Zone + Cycle status + Top collectors ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Collectes par zone (7 jours)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.collectionsByZone} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="zone" width={80} tick={{ fontSize: 11 }} />
              <Tooltip content={<AmountTooltip />} />
              <Bar dataKey="amount" name="Montant" radius={[0, 4, 4, 0]}>
                {data.collectionsByZone.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Statut des cycles">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data.cycleBreakdown}
                dataKey="count"
                nameKey="label"
                cx="50%" cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.cycleBreakdown.map((entry) => (
                  <Cell key={entry.status} fill={CYCLE_COLORS[entry.status] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} cycles`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-1">
            {data.cycleBreakdown.map(e => (
              <span key={e.status} className="flex items-center gap-1 text-xs text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: CYCLE_COLORS[e.status] }} />
                {e.label}: <strong>{e.count}</strong>
              </span>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Top collecteurs (30 jours)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.topCollectors.slice(0, 6)} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
              <Tooltip content={<AmountTooltip />} />
              <Bar dataKey="amount" name="Montant" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Stake distribution + Alert types ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Distribution des mises (cycles ouverts)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.stakeDistribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="stake" tickFormatter={v => `${v} F`} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number, n: string) => [v, 'Clients']} labelFormatter={l => `Mise: ${formatAmount(Number(l))}`} />
              <Bar dataKey="clients" name="Clients" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Alertes ouvertes par type">
          {data.alertsByType.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Aucune alerte ouverte</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.alertsByType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={75} label={({ type, count }) => `${type.replace('_', ' ')} (${count})`}>
                  {data.alertsByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Collector summary table ───────────────────────────────────────── */}
      <ChartCard title="Résumé collecteurs — 30 derniers jours">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="pb-2 pr-4">Collecteur</th>
                <th className="pb-2 pr-4 text-right">Montant</th>
                <th className="pb-2 pr-4 text-right">Opérations</th>
                <th className="pb-2 text-right">Clients</th>
              </tr>
            </thead>
            <tbody>
              {data.topCollectors.map((c, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-800">{c.name}</td>
                  <td className="py-2 pr-4 text-right text-emerald-700 font-mono">{formatAmount(c.amount)}</td>
                  <td className="py-2 pr-4 text-right text-gray-600">{c.count}</td>
                  <td className="py-2 text-right text-gray-600">{c.clients}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

function KpiCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color: string
}) {
  const ring: Record<string, string> = {
    indigo: 'border-indigo-100 bg-indigo-50', emerald: 'border-emerald-100 bg-emerald-50',
    violet: 'border-violet-100 bg-violet-50', sky: 'border-sky-100 bg-sky-50',
    amber: 'border-amber-100 bg-amber-50', orange: 'border-orange-100 bg-orange-50',
    red: 'border-red-100 bg-red-50',
  }
  const text: Record<string, string> = {
    indigo: 'text-indigo-700', emerald: 'text-emerald-700', violet: 'text-violet-700',
    sky: 'text-sky-700', amber: 'text-amber-700', orange: 'text-orange-700', red: 'text-red-700',
  }
  return (
    <div className={`rounded-xl border p-4 ${ring[color] ?? 'border-gray-100 bg-gray-50'}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${text[color] ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  )
}
