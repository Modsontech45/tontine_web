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

function OtpModal({ onClose, onVerified }: { onClose: () => void; onVerified: (code: string) => void }) {
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')
  const [sending, setSending] = useState(false)

  async function sendCode() {
    setSending(true); setErr('')
    try {
      await api.post('/otp/request', { purpose: 'UPDATE_CREDIT_CONFIG' })
      setSent(true)
    } catch (e: any) {
      setErr(e?.response?.data?.error?.message ?? 'Erreur lors de l\'envoi du code.')
    } finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="rounded-2xl shadow-2xl p-7 w-full max-w-sm mx-4" style={{ background: 'var(--c-card)', border: '1px solid var(--c-card-border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--c-text-h)' }}>Vérification requise</p>
            <p className="text-xs" style={{ color: 'var(--c-text-s)' }}>Un code sera envoyé à votre adresse email.</p>
          </div>
        </div>

        {!sent ? (
          <>
            <p className="text-sm mb-5" style={{ color: 'var(--c-text-b)' }}>
              Pour enregistrer la configuration du crédit, vous devez confirmer votre identité par email.
            </p>
            {err && <p className="text-xs text-red-500 mb-3">{err}</p>}
            <div className="flex gap-2">
              <button
                onClick={sendCode} disabled={sending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
              >
                {sending ? 'Envoi…' : 'Envoyer le code'}
              </button>
              <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--c-input-bg)', color: 'var(--c-text-s)' }}>
                Annuler
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm mb-1" style={{ color: 'var(--c-text-b)' }}>Code envoyé. Saisissez les 6 chiffres reçus par email.</p>
            <p className="text-xs mb-4" style={{ color: 'var(--c-text-s)' }}>Le code expire dans 10 minutes.</p>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setErr('') }}
              placeholder="_ _ _ _ _ _"
              className="w-full text-center text-2xl font-mono tracking-[0.4em] py-3 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-input-border)', color: 'var(--c-text-h)' }}
            />
            {err && <p className="text-xs text-red-500 mb-3">{err}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { if (code.length === 6) onVerified(code) }}
                disabled={code.length !== 6}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
              >
                Confirmer
              </button>
              <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--c-input-bg)', color: 'var(--c-text-s)' }}>
                Annuler
              </button>
            </div>
            <button onClick={() => { setSent(false); setCode('') }} className="w-full text-xs mt-3 text-center" style={{ color: 'var(--c-text-m)' }}>
              Renvoyer le code
            </button>
          </>
        )}
      </div>
    </div>
  )
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
  const [showOtp, setShowOtp] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState('')

  useEffect(() => { if (data) setForm(data) }, [data])

  const save = useMutation({
    mutationFn: (otpCode: string) => api.put('/credit/config', { ...form, otp_code: otpCode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-config'] })
      setShowOtp(false); setSaved(true); setSaveErr('')
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (e: any) => {
      setShowOtp(false)
      setSaveErr(e?.response?.data?.error?.message ?? 'Erreur lors de l\'enregistrement')
    },
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

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
    </div>
  )

  const card: React.CSSProperties = { background: 'var(--c-card)', border: '1px solid var(--c-card-border)' }
  const heading: React.CSSProperties = { color: 'var(--c-text-h)' }
  const sub: React.CSSProperties = { color: 'var(--c-text-s)' }
  const body: React.CSSProperties = { color: 'var(--c-text-b)' }
  const inputStyle: React.CSSProperties = { background: 'var(--c-input-bg)', border: '1px solid var(--c-input-border)', color: 'var(--c-text-h)' }

  return (
    <div className="max-w-2xl space-y-7">
      {showOtp && (
        <OtpModal
          onClose={() => setShowOtp(false)}
          onVerified={(code) => save.mutate(code)}
        />
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold" style={heading}>Configuration du Crédit</h2>
        <p className="text-sm mt-1" style={sub}>Définissez les règles d'éligibilité et les taux d'intérêt pour les demandes de crédit des clients.</p>
      </div>

      {/* Enable toggle */}
      <div className="rounded-2xl shadow-sm p-6" style={card}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold" style={heading}>Activer le crédit</p>
            <p className="text-sm mt-0.5" style={sub}>Les collecteurs pourront soumettre des demandes de crédit pour leurs clients.</p>
          </div>
          <button
            onClick={() => setForm(f => ({ ...f, isEnabled: !f.isEnabled }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${form.isEnabled ? 'bg-indigo-600' : 'bg-gray-400'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.isEnabled ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Eligibility */}
      <div className="rounded-2xl shadow-sm p-6 space-y-5" style={card}>
        <h3 className="font-bold flex items-center gap-2" style={heading}>
          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">1</span>
          Éligibilité
        </h3>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={heading}>Mois de contribution minimum</label>
          <p className="text-xs mb-2" style={sub}>Le client doit contribuer depuis au moins ce nombre de mois avant de pouvoir demander un crédit.</p>
          <div className="flex items-center gap-3">
            <input
              type="range" min={1} max={12} step={1}
              value={form.minContributingMonths}
              onChange={e => setForm(f => ({ ...f, minContributingMonths: +e.target.value }))}
              className="flex-1 accent-indigo-600"
            />
            <span className="w-16 text-center font-bold text-indigo-400 rounded-lg py-1 text-sm" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-input-border)' }}>
              {form.minContributingMonths} mois
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={heading}>Montant maximum du prêt (FCFA)</label>
          <p className="text-xs mb-2" style={sub}>Plafond absolu pour toute demande de crédit.</p>
          <div className="flex items-center gap-3">
            <input
              type="range" min={10000} max={500000} step={5000}
              value={form.maxLoanAmount}
              onChange={e => setForm(f => ({ ...f, maxLoanAmount: +e.target.value }))}
              className="flex-1 accent-indigo-600"
            />
            <span className="w-24 text-center font-bold text-indigo-400 rounded-lg py-1 text-sm" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-input-border)' }}>
              {formatAmount(form.maxLoanAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Interest tiers */}
      <div className="rounded-2xl shadow-sm p-6 space-y-4" style={card}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2" style={heading}>
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">2</span>
            Taux d'intérêt par durée
          </h3>
          <button onClick={addTier} disabled={form.tiers.length >= 6}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-indigo-400 hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-input-border)' }}>
            + Ajouter une durée
          </button>
        </div>

        <p className="text-xs" style={sub}>Définissez le taux d'intérêt selon la durée de remboursement choisie par le client.</p>

        <div className="space-y-3">
          {form.tiers.map((tier, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-card-border)' }}>
              <div className="flex-1">
                <label className="text-xs font-medium" style={sub}>Durée (mois)</label>
                <input type="number" min={1} max={24} value={tier.months}
                  onChange={e => updateTier(i, 'months', +e.target.value)}
                  className="mt-1 w-full rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  style={inputStyle}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium" style={sub}>Intérêt (%)</label>
                <input type="number" min={0} max={100} step={0.5} value={tier.interestPct}
                  onChange={e => updateTier(i, 'interestPct', +e.target.value)}
                  className="mt-1 w-full rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  style={inputStyle}
                />
              </div>
              <div className="flex-1 pt-4">
                <p className="text-xs" style={sub}>Sur {formatAmount(form.maxLoanAmount)}</p>
                <p className="text-sm font-bold text-emerald-400">
                  → {formatAmount(Math.round(form.maxLoanAmount * (1 + tier.interestPct / 100)))}
                </p>
              </div>
              <button onClick={() => removeTier(i)} disabled={form.tiers.length <= 1}
                className="mt-4 text-red-400 hover:text-red-500 disabled:opacity-30">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6M14,11v6"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-card-border)' }}>
        <h3 className="font-bold mb-3" style={heading}>Aperçu des règles</h3>
        <ul className="space-y-2 text-sm" style={body}>
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 mt-0.5">✓</span>
            Un client doit contribuer depuis <strong>{form.minContributingMonths} mois</strong> avant d'être éligible.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 mt-0.5">✓</span>
            Le montant maximum d'un prêt est <strong>{formatAmount(form.maxLoanAmount)}</strong>.
          </li>
          {form.tiers.map((t, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">✓</span>
              Prêt sur <strong>{t.months} mois</strong> : taux d'intérêt <strong>{t.interestPct}%</strong>.
            </li>
          ))}
        </ul>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => { setSaveErr(''); setShowOtp(true) }}
          disabled={save.isPending}
          className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-60 transition-all flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          {save.isPending ? 'Enregistrement…' : 'Enregistrer la configuration'}
        </button>
        {saved && <span className="text-sm text-emerald-500 font-medium">✓ Configuration enregistrée</span>}
        {saveErr && <span className="text-sm text-red-400">{saveErr}</span>}
      </div>
    </div>
  )
}
