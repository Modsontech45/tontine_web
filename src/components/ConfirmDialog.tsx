import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  title: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  confirmColor?: 'green' | 'red' | 'indigo'
  loading?: boolean
  children: ReactNode
}

export function ConfirmDialog({
  title, onConfirm, onCancel, confirmLabel = 'Confirmer',
  confirmColor = 'green', loading = false, children,
}: ConfirmDialogProps) {
  const colors: Record<string, string> = {
    green:  'bg-green-700 hover:bg-green-800',
    red:    'bg-red-600 hover:bg-red-700',
    indigo: 'bg-indigo-600 hover:bg-indigo-700',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">{title}</h3>
          <div className="text-sm text-gray-700 space-y-2">{children}</div>
        </div>
        <div className="flex gap-2 px-6 pb-5 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 ${colors[confirmColor]}`}
          >
            {loading ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
