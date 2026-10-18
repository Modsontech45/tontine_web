import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../lib/api'

const SETTING_LABELS: Record<string, { label: string; desc: string; unit?: string }> = {
  commission_strategy:            { label: 'Comment la commission est prélevée', desc: 'ONE_STAKE = le collecteur garde une mise par carnet. PERCENTAGE = un pourcentage du total collecté.' },
  commission_value:               { label: 'Montant de la commission',           desc: 'Si ONE_STAKE : montant fixe en F. Si PERCENTAGE : pourcentage (ex: 5 = 5%).' },
  stake_min:                      { label: 'Mise journalière minimale (F)',       desc: 'Un client ne peut pas avoir une mise inférieure à ce montant.' },
  stake_max:                      { label: 'Mise journalière maximale (F)',       desc: 'Un client ne peut pas avoir une mise supérieure à ce montant.' },
  stake_step:                     { label: 'Multiples de mise acceptés (F)',      desc: 'La mise doit être un multiple de ce nombre. Ex : 25 → mises autorisées : 100, 125, 150, 175…' },
  cycle_default_length:           { label: 'Durée d\'un cycle (jours)',          desc: 'Nombre de jours dans un cycle tontine. En général 31 jours (un mois).' },
  gps_alert_distance_m:           { label: 'Alerte si le collecteur est à plus de (m)', desc: 'Une alerte est créée si le collecteur enregistre une collecte à plus de X mètres du domicile du client.' },
  inactive_days:                  { label: 'Alerte client inactif après (jours)', desc: 'Si un client n\'a pas été visité depuis ce nombre de jours, une alerte est déclenchée.' },
  spot_checks_per_collector_week: { label: 'Visites de contrôle par semaine',    desc: 'Nombre de fois par semaine qu\'un superviseur doit vérifier le travail de chaque collecteur sur le terrain.' },
  sms_weekly_enabled:             { label: 'SMS hebdomadaire activé',            desc: 'Envoi automatique d\'un récapitulatif SMS chaque semaine.' },
  sms_unit_cost_xof:              { label: 'Coût d\'un SMS (F)',                 desc: 'Prix d\'un SMS en francs CFA, utilisé pour le calcul des coûts.' },
  office_phone:                   { label: 'Téléphone du bureau',                desc: 'Numéro de contact principal de l\'agence.' },
  company_name:                   { label: 'Nom de la société',                  desc: 'Nom affiché sur les reçus, stickers et notifications.' },
}

const HIDDEN_SETTINGS = new Set(['sms_weekly_enabled', 'sms_unit_cost_xof'])

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

  const meta = SETTING_LABELS[name]
  const label = meta?.label ?? name
  const desc  = meta?.desc  ?? ''

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
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          {desc && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {editing ? (
            <>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') save.mutate(); if (e.key === 'Escape') setEditing(false) }}
                className="border rounded px-2 py-1 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button onClick={() => save.mutate()} disabled={save.isPending} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50 font-medium">
                {save.isPending ? '…' : 'Enregistrer'}
              </button>
              <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-700">Annuler</button>
            </>
          ) : (
            <>
              <span className="text-sm font-mono font-semibold text-gray-900 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                {JSON.stringify(value)}
              </span>
              <button
                onClick={() => { setDraft(String(value)); setEditing(true) }}
                className="text-gray-300 hover:text-indigo-600 transition-colors"
                title="Modifier"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110.414 16H8v-2.414a2 2 0 01.586-1.414z" />
                </svg>
              </button>
            </>
          )}
          {flash && <span className={`text-xs ${flash.ok ? 'text-green-600' : 'text-red-600'}`}>{flash.msg}</span>}
        </div>
      </div>
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
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Paramètres</h2>
        <p className="text-sm text-gray-400 mt-1">Configuration générale de la plateforme</p>
      </div>
      {isLoading ? (
        <p className="text-gray-400 text-sm">Chargement...</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 max-w-2xl overflow-hidden">
          {Object.entries(data ?? {}).filter(([key]) => !HIDDEN_SETTINGS.has(key)).map(([key, value]) => (
            <SettingRow key={key} name={key} value={value} />
          ))}
        </div>
      )}
    </div>
  )
}
