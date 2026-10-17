import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatAmount } from '../lib/format'

interface Tier { months: number; interestPct: number }
interface Config {
  minContributingMonths: number
  maxLoanAmount: number
  tiers: Tier[]
  isEnabled: boolean
}

export function CreditConfigPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<Config>({
    queryKey: ['credit-config'],
    queryFn: () => api.get('/credit/config').then(r => r.data),
  })

  const [form, setForm] = useState<Config>({
    minContributingMonths: 3,
    maxLoanAmount: 100000,
    tiers: [
      { months: 1, interestPct: 5 },
      { months: 2, interestPct: 10 },
      { months: 3, interestPct: 15 },
    ],
    isEnabled: true,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => { if (data) setForm(data) }, [data])

  const save = useMutation({
    mutationFn: () => api.put('/credit/config', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['credit-config'] }); setSaved(true); setTimeout(() => setSaved(false), 3000) },
  })

  function updateTier(i: number, field: keyof Tier, val: number) {
    setForm(f => { const t = [...f.tiers]; t[i] = { ...t[i], [field]: val }; return { ...f, tiers: t } })
  }
  function addTier() {
    const next = (form.tiers[form.tiers.length - 1]?.months ?? 0) + 1
    setForm(f => ({ ...f, tiers: [...f.tiers, { months: next, interestPct: 0 }] }))
  }
  function removeTier(i: number) {
    setForm(f => ({ ...f, tiers: f.tiers.filter((_, j) => j !== i) }))
  }

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" /></div>

  return (
    <div className="max-w-2xl space-y-7">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configuration du Crédit</h2>
        <p className="text-sm text-gray-500 mt-1">Définissez les règles d'éligibilité et les taux d'intérêt pour les demandes de crédit des clients.</p>
      </div>

      {/* Enable toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">Activer le crédit</p>
            <p className="text-sm text-gray-500 mt-0.5">Les collecteurs pourront soumettre des demandes de crédit pour leurs clients.</p>
          </div>
          <button
            onClick={() => setForm(f => ({ ...f, isEnabled: !f.isEnabled }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${form.isEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.isEnabled ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Eligibility */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">1</span>
          Éligibilité
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Mois de contribution minimum
          </label>
          <p className="text-xs text-gray-400 mb-2">Le client doit contribuer depuis au moins ce nombre de mois avant de pouvoir demander un crédit.</p>
          <div className="flex items-center gap-3">
            <input
              type="range" min={1} max={12} step={1}
              value={form.minContributingMonths}
              onChange={e => setForm(f => ({ ...f, minContributingMonths: +e.target.value }))}
              className="flex-1 accent-indigo-600"
            />
            <span className="w-16 text-center font-bold text-indigo-700 bg-indigo-50 rounded-lg py-1 text-sm">
              {form.minContributingMonths} mois
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Montant maximum du prêt (FCFA)</label>
          <p className="text-xs text-gray-400 mb-2">Plafond absolu pour toute demande de crédit.</p>
          <div className="flex items-center gap-3">
            <input
              type="range" min={10000} max={500000} step={5000}
              value={form.maxLoanAmount}
              onChange={e => setForm(f => ({ ...f, maxLoanAmount: +e.target.value }))}
              className="flex-1 accent-indigo-600"
            />
            <span className="w-24 text-center font-bold text-indigo-700 bg-indigo-50 rounded-lg py-1 text-sm">
              {formatAmount(form.maxLoanAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Interest tiers */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">2</span>
            Taux d'intérêt par durée
          </h3>
          <button onClick={addTier} disabled={form.tiers.length >= 6}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40">
            + Ajouter une durée
          </button>
        </div>

        <p className="text-xs text-gray-400">Définissez le taux d'intérêt selon la durée de remboursement choisie par le client.</p>

        <div className="space-y-3">
          {form.tiers.map((tier, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className="flex-1">
                <label className="text-xs text-gray-500 font-medium">Durée (mois)</label>
                <input type="number" min={1} max={24} value={tier.months}
                  onChange={e => updateTier(i, 'months', +e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 font-medium">Intérêt (%)</label>
                <input type="number" min={0} max={100} step={0.5} value={tier.interestPct}
                  onChange={e => updateTier(i, 'interestPct', +e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="flex-1 pt-4">
                <p className="text-xs text-gray-400">Sur {formatAmount(form.maxLoanAmount)}</p>
                <p className="text-sm font-bold text-emerald-700">
                  → Remboursement: {formatAmount(Math.round(form.maxLoanAmount * (1 + tier.interestPct / 100)))}
                </p>
              </div>
              <button onClick={() => removeTier(i)} disabled={form.tiers.length <= 1}
                className="mt-4 text-red-400 hover:text-red-600 disabled:opacity-30">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6M14,11v6"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6">
        <h3 className="font-bold text-gray-900 mb-3">Aperçu des règles</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 mt-0.5">✓</span>
            Un client doit contribuer depuis <strong>{form.minContributingMonths} mois</strong> avant d'être éligible.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 mt-0.5">✓</span>
            Le montant maximum d'un prêt est <strong>{formatAmount(form.maxLoanAmount)}</strong>.
          </li>
          {form.tiers.map((t, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">✓</span>
              Prêt sur <strong>{t.months} mois</strong> : taux d'intérêt <strong>{t.interestPct}%</strong>.
            </li>
          ))}
        </ul>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-60 transition-all"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
        >
          {save.isPending ? 'Enregistrement…' : 'Enregistrer la configuration'}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">✓ Configuration enregistrée</span>}
        {save.isError && <span className="text-sm text-red-600">Erreur lors de l'enregistrement</span>}
      </div>
    </div>
  )
}
