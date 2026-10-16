import { useState } from 'react'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/v1` : '/v1'

export function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await axios.post(`${BASE}/auth/forgot-password`, { email })
      setStep('reset')
    } catch {
      setError('Erreur lors de l\'envoi. Vérifiez l\'adresse email.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    setLoading(true)
    try {
      await axios.post(`${BASE}/auth/reset-password`, { email, otp_code: otp, new_password: newPassword })
      setStep('done')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Code invalide ou expiré.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-blue-700 mb-2">Tontine Prospera</h1>
        <p className="text-gray-500 mb-6 text-sm">Réinitialiser le mot de passe</p>

        {step === 'email' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom@example.com"
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Envoi...' : 'Envoyer le code'}
            </button>
            <div className="text-center">
              <a href="/login" className="text-sm text-blue-600 hover:underline">Retour à la connexion</a>
            </div>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-gray-600 bg-blue-50 rounded-md px-3 py-2">
              Un code à 6 chiffres a été envoyé à votre email.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code de vérification</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full border rounded-md px-3 py-2 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || otp.length !== 6 || newPassword.length < 8}
              className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center">
            <div className="text-green-600 text-4xl">✓</div>
            <p className="text-gray-700 font-medium">Mot de passe réinitialisé avec succès.</p>
            <a
              href="/login"
              className="block w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 text-center"
            >
              Retour à la connexion
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
