import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatAmount } from '../lib/format'

interface Config {
  isEnabled: boolean
  interestShortPct: number
  interestLongPct: number
  minLoanAmount: number
  minContributingMonths: number
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
    isEnabled: true,
    interestShortPct: 5,
    interestLongPct: 7.5,
    minLoanAmount: 5000,
    minContributingMonths: 1,
  })
  const [showOtp, setShowOtp] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState('')

  useEffect(() => {
    if (!data) return
    setForm({
      isEnabled: data.isEnabled,
      interestShortPct: data.interestShortPct ?? 5,
      interestLongPct: data.interestLongPct ?? 7.5,
      minLoanAmount: data.minLoanAmount ?? 5000,
      minContributingMonths: data.minContributingMonths ?? 1,
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

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
    </div>
  )

  const card: React.CSSProperties = { background: 'var(--c-card)', border: '1px solid var(--c-card-border)' }
  const heading: React.CSSProperties = { color: 'var(--c-text-h)' }
  const sub: React.CSSProperties = { color: 'var(--c-text-s)' }
  const inputStyle: React.CSSProperties = { background: 'var(--c-input-bg)', border: '1px solid var(--c-input-border)', color: 'var(--c-text-h)' }

  // Example: a client contributing 500/day → 15 500/month
  const exampleDaily = 500
  const exampleMax = exampleDaily * 31

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
        <p className="text-sm mt-1" style={sub}>Définissez les règles d'accès au crédit. Le montant maximum est automatiquement calculé à partir de la contribution mensuelle du client.</p>
      </div>

      {/* How it works */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-card-border)' }}>
        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--c-text-m)' }}>Comment ça fonctionne</p>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--c-text-b)' }}>
          <li className="flex items-start gap-2">
            <svg className="flex-shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
            <span>Le plafond d'emprunt = contribution journalière × 31 jours.</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="flex-shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
            <span>Exemple : {formatAmount(exampleDaily)} FCFA/j → peut emprunter jusqu'à <strong>{formatAmount(exampleMax)} FCFA</strong>.</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="flex-shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
            <span>Le collecteur saisit librement un montant entre le minimum et ce plafond.</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="flex-shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
            <span>L'intérêt est prélevé à l'avance. Le client rembourse le montant demandé en entier.</span>
          </li>
        </ul>
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

      {/* Loan amount limits */}
      <div className="rounded-2xl shadow-sm p-6 space-y-5" style={card}>
        <div>
          <h3 className="font-bold flex items-center gap-2" style={heading}>
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">1</span>
            Limites du prêt
          </h3>
          <p className="text-xs mt-1" style={sub}>Le plafond est calculé dynamiquement par client. Seul le plancher est configurable ici.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-card-border)' }}>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Montant minimum</span>
            <div className="flex items-end gap-1 mt-3">
              <input
                type="number" min={1000} step={500}
                value={form.minLoanAmount}
                onChange={e => setForm(f => ({ ...f, minLoanAmount: +e.target.value }))}
                className="w-28 text-2xl font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-400"
                style={inputStyle}
              />
              <span className="text-sm font-bold mb-1" style={{ color: 'var(--c-text-s)' }}>FCFA</span>
            </div>
            <p className="text-xs mt-2" style={sub}>Plancher configurable par l'admin</p>
          </div>

          <div className="p-4 rounded-xl" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-card-border)' }}>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Montant maximum</span>
            <div className="mt-3">
              <p className="text-2xl font-bold" style={{ color: 'var(--c-text-h)' }}>Automatique</p>
            </div>
            <p className="text-xs mt-2" style={sub}>= contribution/j × 31 (par client)</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={sub}>Mois de contribution requis pour être éligible</label>
          <div className="flex items-center gap-3">
            <input
              type="number" min={0} max={24}
              value={form.minContributingMonths}
              onChange={e => setForm(f => ({ ...f, minContributingMonths: +e.target.value }))}
              className="w-24 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
              style={inputStyle}
            />
            <span className="text-sm" style={sub}>mois minimum de cotisations actives</span>
          </div>
        </div>
      </div>

      {/* Interest rules */}
      <div className="rounded-2xl shadow-sm p-6 space-y-4" style={card}>
        <div>
          <h3 className="font-bold flex items-center gap-2" style={heading}>
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">%</span>
            Taux d'intérêt
          </h3>
          <p className="text-xs mt-1" style={sub}>L'intérêt est prélevé sur le montant emprunté avant remise au client. Le client rembourse le montant demandé en entier.</p>
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
