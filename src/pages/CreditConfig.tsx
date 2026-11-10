import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatAmount } from '../lib/format'

interface CreditPackage { amount: number; minContributingMonths: number; dailyAmount: number }
interface Config {
  tiers: CreditPackage[]
  isEnabled: boolean
  interestShortPct: number
  interestLongPct: number
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
    tiers: [
      { amount: 100000, minContributingMonths: 1, dailyAmount: Math.ceil(100000 / 31) },
      { amount: 35000,  minContributingMonths: 1, dailyAmount: Math.ceil(35000 / 31) },
      { amount: 20000,  minContributingMonths: 1, dailyAmount: Math.ceil(20000 / 31) },
    ],
    isEnabled: true,
    interestShortPct: 5,
    interestLongPct: 7.5,
  })
  const [showOtp, setShowOtp] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPkg, setNewPkg] = useState<CreditPackage>({ amount: 50000, minContributingMonths: 1, dailyAmount: Math.ceil(50000 / 31) })

  useEffect(() => {
    if (!data) return
    setForm({
      ...data,
      interestShortPct: data.interestShortPct ?? 5,
      interestLongPct: data.interestLongPct ?? 7.5,
      tiers: (data.tiers ?? []).map(p => ({
        ...p,
        minContributingMonths: p.minContributingMonths ?? 1,
        dailyAmount: p.dailyAmount ?? Math.ceil(p.amount / 31),
      })),
    })
  }, [data])

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

  function updatePkg(i: number, field: keyof CreditPackage, val: number) {
    setForm(f => { const t = [...f.tiers]; t[i] = { ...t[i], [field]: val }; return { ...f, tiers: t } })
  }
  function addPkg() {
    setForm(f => ({ ...f, tiers: [...f.tiers, newPkg] }))
    setNewPkg({ amount: 50000, minContributingMonths: 1, dailyAmount: Math.ceil(50000 / 31) })
    setShowAddForm(false)
  }
  function removePkg(i: number) {
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

      {/* Interest rules */}
      <div className="rounded-2xl shadow-sm p-6 space-y-4" style={card}>
        <div>
          <h3 className="font-bold flex items-center gap-2" style={heading}>
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">%</span>
            Règles d'intérêt
          </h3>
          <p className="text-xs mt-1" style={sub}>Le taux est appliqué automatiquement selon la durée choisie par le client au moment de la demande.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-card-border)' }}>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">≤ 1 mois</span>
            <div className="flex items-end gap-1 mt-3">
              <input
                type="number" min={0.1} max={50} step={0.5}
                value={form.interestShortPct}
                onChange={e => setForm(f => ({ ...f, interestShortPct: +e.target.value }))}
                className="w-20 text-2xl font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-400"
                style={inputStyle}
              />
              <span className="text-xl font-bold mb-1" style={{ color: 'var(--c-text-h)' }}>%</span>
            </div>
            <p className="text-xs mt-2" style={sub}>Remboursement en 1 mois</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-card-border)' }}>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">&gt; 1 mois</span>
            <div className="flex items-end gap-1 mt-3">
              <input
                type="number" min={0.1} max={50} step={0.5}
                value={form.interestLongPct}
                onChange={e => setForm(f => ({ ...f, interestLongPct: +e.target.value }))}
                className="w-20 text-2xl font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={inputStyle}
              />
              <span className="text-xl font-bold mb-1" style={{ color: 'var(--c-text-h)' }}>%</span>
            </div>
            <p className="text-xs mt-2" style={sub}>Remboursement en plus d'1 mois</p>
          </div>
        </div>
      </div>

      {/* Packages */}
      <div className="rounded-2xl shadow-sm p-6 space-y-4" style={card}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2" style={heading}>
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">2</span>
            Packages de crédit
          </h3>
          {!showAddForm && (
            <button
              onClick={() => { setShowAddForm(true); setEditingIdx(null) }}
              disabled={form.tiers.length >= 12}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-indigo-400 hover:opacity-80 disabled:opacity-40"
              style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-input-border)' }}>
              + Ajouter un package
            </button>
          )}
        </div>

        <p className="text-xs" style={sub}>Chaque package définit un montant et les conditions d'éligibilité. Le client choisit ensuite la durée — le taux est appliqué selon les règles ci-dessus.</p>

        {/* Package cards */}
        <div className="space-y-3">
          {form.tiers.map((pkg, i) => {
            const isEditing = editingIdx === i
            const shortReceived = pkg.amount - Math.round(pkg.amount * form.interestShortPct / 100)
            const longReceived  = pkg.amount - Math.round(pkg.amount * form.interestLongPct / 100)
            const daily = Math.ceil(pkg.amount / 31)

            if (isEditing) return (
              <div key={i} className="p-4 rounded-xl" style={{ background: 'var(--c-input-bg)', border: '2px solid #6366f1' }}>
                <p className="text-xs font-bold mb-3" style={{ color: '#818cf8' }}>Modifier le package</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-medium" style={sub}>Montant (FCFA)</label>
                    <input type="number" min={1000} step={5000} value={pkg.amount}
                      onChange={e => updatePkg(i, 'amount', +e.target.value)}
                      className="mt-1 w-full rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-xs font-medium" style={sub}>Mois de contribution requis</label>
                    <input type="number" min={1} max={24} value={pkg.minContributingMonths}
                      onChange={e => updatePkg(i, 'minContributingMonths', +e.target.value)}
                      className="mt-1 w-full rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      style={inputStyle} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium" style={sub}>Versement journalier (FCFA)</label>
                    <p className="text-xs mb-1" style={{ color: 'var(--c-text-m)' }}>Minimum calculé: {formatAmount(daily)} F</p>
                    <input type="number" min={1} step={50} value={pkg.dailyAmount}
                      onChange={e => updatePkg(i, 'dailyAmount', +e.target.value)}
                      className="mt-0 w-full rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      style={inputStyle} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingIdx(null)}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    Valider
                  </button>
                  <button onClick={() => setEditingIdx(null)}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ background: 'var(--c-card)', border: '1px solid var(--c-card-border)', color: 'var(--c-text-s)' }}>
                    Annuler
                  </button>
                </div>
              </div>
            )

            return (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-card-border)' }}>
                {/* Amount badge */}
                <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
                  <span className="text-white font-bold text-sm leading-tight">{formatAmount(pkg.amount)}</span>
                  <span className="text-indigo-300 text-[10px]">FCFA</span>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                    <span style={sub}>Éligible après <strong style={heading}>{pkg.minContributingMonths} mois</strong></span>
                    <span style={sub}><strong style={heading}>{formatAmount(pkg.dailyAmount)}</strong>/jour</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mt-1">
                    <span className="text-green-500">1 mois → reçoit {formatAmount(shortReceived)} F</span>
                    <span className="text-amber-500">+1 mois → reçoit {formatAmount(longReceived)} F</span>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => { setEditingIdx(i); setShowAddForm(false) }}
                    className="p-2 rounded-lg hover:opacity-80"
                    style={{ background: 'var(--c-card)', border: '1px solid var(--c-card-border)', color: '#818cf8' }}
                    title="Modifier">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button onClick={() => removePkg(i)} disabled={form.tiers.length <= 1}
                    className="p-2 rounded-lg hover:opacity-80 disabled:opacity-30"
                    style={{ background: 'var(--c-card)', border: '1px solid var(--c-card-border)', color: '#f87171' }}
                    title="Supprimer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/>
                      <path d="M10,11v6M14,11v6"/>
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add package form */}
        {showAddForm && (
          <div className="p-4 rounded-xl" style={{ background: 'var(--c-input-bg)', border: '2px solid #6366f1' }}>
            <p className="text-xs font-bold mb-3" style={{ color: '#818cf8' }}>Nouveau package</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium" style={sub}>Montant (FCFA)</label>
                <input type="number" min={1000} step={5000} value={newPkg.amount}
                  onChange={e => setNewPkg(p => ({ ...p, amount: +e.target.value, dailyAmount: Math.ceil(+e.target.value / 31) }))}
                  className="mt-1 w-full rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium" style={sub}>Mois de contribution requis</label>
                <input type="number" min={1} max={24} value={newPkg.minContributingMonths}
                  onChange={e => setNewPkg(p => ({ ...p, minContributingMonths: +e.target.value }))}
                  className="mt-1 w-full rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  style={inputStyle} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium" style={sub}>Versement journalier (FCFA)</label>
                <p className="text-xs mb-1" style={{ color: 'var(--c-text-m)' }}>Minimum calculé: {formatAmount(Math.ceil(newPkg.amount / 31))} F</p>
                <input type="number" min={1} step={50} value={newPkg.dailyAmount}
                  onChange={e => setNewPkg(p => ({ ...p, dailyAmount: +e.target.value }))}
                  className="mt-0 w-full rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  style={inputStyle} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addPkg}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                Ajouter
              </button>
              <button onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--c-card)', border: '1px solid var(--c-card-border)', color: 'var(--c-text-s)' }}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-card-border)' }}>
        <h3 className="font-bold mb-3" style={heading}>Aperçu des règles</h3>
        <ul className="space-y-2 text-sm" style={body}>
          {form.tiers.map((p, i) => {
            const shortReceived = p.amount - Math.round(p.amount * form.interestShortPct / 100)
            const longReceived = p.amount - Math.round(p.amount * form.interestLongPct / 100)
            return (
              <li key={i} className="flex items-start gap-2">
                <svg className="flex-shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
                <span>
                  Package <strong>{formatAmount(p.amount)}</strong> FCFA —{' '}
                  1 mois ({form.interestShortPct}%) → reçoit <strong className="text-green-500">{formatAmount(shortReceived)}</strong>
                  {' '}· +1 mois ({form.interestLongPct}%) → reçoit <strong className="text-amber-500">{formatAmount(longReceived)}</strong>.
                  {' '}Éligible après <strong>{p.minContributingMonths} mois</strong>.{' '}
                  Versement journalier: <strong>{formatAmount(p.dailyAmount)}/j</strong>.
                </span>
              </li>
            )
          })}
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
        {saved && <span className="text-sm text-emerald-500 font-medium flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>Configuration enregistrée</span>}
        {saveErr && <span className="text-sm text-red-400">{saveErr}</span>}
      </div>
    </div>
  )
}
