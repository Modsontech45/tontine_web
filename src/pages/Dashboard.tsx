import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
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
    todayVersed: number; todayGap: number
    expectedToday: number; remainingToday: number
  }
  dailyCollections: Array<{ date: string; amount: number; count: number }>
  monthlyRevenue: Array<{ month: string; amount: number; count: number }>
  collectionsByZone: Array<{ zone: string; amount: number; count: number }>
  topCollectors: Array<{ name: string; amount: number; clients: number; count: number }>
  cycleBreakdown: Array<{ status: string; label: string; count: number }>
  alertsByType: Array<{ type: string; count: number }>
  stakeDistribution: Array<{ stake: number; clients: number }>
}

const CYCLE_COLORS: Record<string, string> = {
  OPEN: '#6366f1', CLOSED: '#f59e0b', PAID: '#10b981', CANCELLED: '#ef4444',
}
const ZONE_COLORS = ['#6366f1', '#D4A017', '#10b981', '#06b6d4', '#f97316', '#8b5cf6', '#ec4899', '#ef4444']

function fmtShort(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return `${v}`
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <strong>{p.dataKey === 'count' ? p.value : formatAmount(p.value)}</strong>
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
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Chargement du tableau de bord…</p>
      </div>
    </div>
  )
  if (error || !data) return (
    <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-red-600">
      Impossible de charger le tableau de bord.
    </div>
  )

  const { kpis } = data

  // Merge dailyCollections to also show versed (we only have total versed for today, so use collected for chart)
  const chartData = data.dailyCollections.slice(-14).map(d => ({
    date: d.date.slice(5),
    Collecté: d.amount,
    Opérations: d.count,
  }))

  return (
    <div className="space-y-7">
      {/* ── 5 KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
        <TodayCollectionCard
          collected={kpis.todayAmount}
          expected={kpis.expectedToday}
          count={kpis.todayCount}
        />
        <KpiCard
          label="Chez les collecteurs"
          value={`${fmtShort(kpis.remainingToday)} F`}
          sub={kpis.remainingToday === 0 ? 'Tout versé à la caisse ✓' : 'non encore versé à la caisse'}
          borderColor={kpis.remainingToday > 0 ? '#f97316' : '#10b981'}
          dotColor="bg-orange-500"
          highlight={kpis.remainingToday > 0}
        />
        <KpiCard
          label="Collecté ce mois"
          value={`${fmtShort(kpis.monthAmount)} F`}
          sub={`${kpis.monthCount} opérations`}
          borderColor="#f59e0b"
          dotColor="bg-amber-500"
        />
        <KpiCard
          label="Clients actifs"
          value={`${kpis.activeClients}`}
          sub={`${kpis.suspendedClients} suspendus`}
          borderColor="#06b6d4"
          dotColor="bg-cyan-500"
        />
        <KpiCard
          label="Cycles ouverts"
          value={`${kpis.openCycles}`}
          sub={kpis.pendingAlerts > 0 ? `${kpis.pendingAlerts} alertes` : 'Aucune alerte'}
          borderColor="#10b981"
          dotColor="bg-emerald-500"
        />
      </div>

      {/* ── Charts row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Area chart — 14 days */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900">Collectes — 14 derniers jours</h3>
              <p className="text-xs text-gray-400 mt-0.5">Montant encaissé par date</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-400 inline-block"/>#Collecté</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmtShort(v)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Collecté" stroke="#94a3b8" fill="url(#gCollected)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#64748b' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Cycle donut */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900">Statut des cycles</h3>
            <p className="text-xs text-gray-400 mt-0.5">Répartition globale</p>
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={data.cycleBreakdown}
                  dataKey="count"
                  nameKey="label"
                  cx="50%" cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {data.cycleBreakdown.map((entry) => (
                    <Cell key={entry.status} fill={CYCLE_COLORS[entry.status] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number, name) => [`${v}`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {data.cycleBreakdown.map(e => (
              <div key={e.status} className="flex items-center gap-2 text-xs text-gray-600">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CYCLE_COLORS[e.status] ?? '#94a3b8' }} />
                <span className="truncate">{e.label}</span>
                <strong className="ml-auto">{e.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top collectors table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-900">Top Collecteurs — 30 jours</h3>
            <span className="text-xs text-indigo-600 font-medium cursor-pointer hover:underline">Voir tout</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nom</th>
                <th className="text-left pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Montant</th>
                <th className="text-left pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Opérations</th>
                <th className="text-left pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Clients</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.topCollectors.map((c, i) => (
                <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                           style={{ background: ZONE_COLORS[i % ZONE_COLORS.length] }}>
                        {c.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{c.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-bold text-gray-900">{formatAmount(c.amount)}</span>
                  </td>
                  <td className="py-3 pr-4 text-gray-500">{c.count}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">{c.clients}</span>
                  </td>
                </tr>
              ))}
              {data.topCollectors.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-gray-400 text-sm">Aucune donnée ce mois</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Zone bar chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900">Collectes par zone</h3>
            <p className="text-xs text-gray-400 mt-0.5">7 derniers jours</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.collectionsByZone} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="zone" width={70} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" name="Montant" radius={[0, 6, 6, 0]} maxBarSize={20}>
                {data.collectionsByZone.map((_, i) => (
                  <Cell key={i} fill={ZONE_COLORS[i % ZONE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Monthly bar */}
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs font-semibold text-gray-500 mb-3">Revenus mensuels</p>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={data.monthlyRevenue} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" name="Montant" fill="#D4A017" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Extra KPIs row ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SmallKpi label="Versé aujourd'hui" value={`${fmtShort(kpis.todayVersed)} F`} color="#10b981" />
        <SmallKpi
          label="Écart du jour"
          value={`${fmtShort(Math.abs(kpis.todayGap))} F`}
          sub={(kpis.todayGap ?? 0) < 0 ? 'manquant' : (kpis.todayGap ?? 0) > 0 ? 'non versé' : 'équilibré'}
          color={(kpis.todayGap ?? 0) !== 0 ? '#ef4444' : '#10b981'}
        />
        <SmallKpi label="Alertes ouvertes" value={`${kpis.pendingAlerts}`} color={kpis.pendingAlerts > 5 ? '#ef4444' : '#f59e0b'} />
        <SmallKpi label="Annulations en attente" value={`${kpis.pendingVoids}`} color="#f97316" />
      </div>
    </div>
  )
}

/* ── Today Collection Card ────────────────────────────────── */
function TodayCollectionCard({ collected, expected, count }: {
  collected: number; expected: number; count: number
}) {
  const pct = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ borderTop: '4px solid #6366f1' }}>
      <div className="p-5">
        <p className="text-sm font-medium text-gray-500 mb-3">Collecté aujourd'hui</p>
        <p className="text-3xl font-black text-gray-900 tracking-tight">{fmtShort(collected)} F</p>
        <p className="text-xs text-gray-400 mt-1">{count} opérations · attendu {fmtShort(expected)} F</p>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{pct}% collecté</span>
            <span>{fmtShort(Math.max(0, expected - collected))} F restants</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : '#6366f1' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── KPI Card ─────────────────────────────────────────────── */
function KpiCard({ label, value, sub, borderColor, highlight }: {
  label: string; value: string; sub?: string | null
  borderColor: string; dotColor: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-2xl shadow-sm overflow-hidden relative ${highlight ? 'ring-2 ring-orange-300' : 'bg-white'}`}
         style={{ borderTop: `4px solid ${borderColor}`, background: highlight ? '#fff7ed' : 'white' }}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-gray-500 leading-tight">{label}</p>
          {highlight && <span className="text-xs font-bold text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded-full">En attente</span>}
        </div>
        <p className="text-3xl font-black text-gray-900 tracking-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
      </div>
    </div>
  )
}

/* ── Small KPI ────────────────────────────────────────────── */
function SmallKpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
