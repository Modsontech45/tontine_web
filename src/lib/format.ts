export function formatAmount(amountFcfa: number): string {
  return new Intl.NumberFormat('fr-TG').format(amountFcfa) + ' F'
}

export function formatDate(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return d.toLocaleDateString('fr-TG', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return d.toLocaleString('fr-TG', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrateur',
  CONTROLLER: 'Contrôleur',
  CASHIER: 'Caissier',
  COLLECTOR: 'Collecteur',
}

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  CLOSED: 'Clôturé',
  OPEN: 'Ouvert',
  CONFIRMED: 'Confirmé',
  VALIDATED: 'Validé',
  PAID: 'Payé',
  CANCELLED: 'Annulé',
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REVOKED: 'Révoqué',
  AVAILABLE: 'Disponible',
  ASSIGNED: 'Assigné',
  USED: 'Utilisé',
}
