import { api } from './api'

export interface AuthUser {
  id: string
  role: string
  first_name: string
  last_name: string
}

export async function login(credentials: { phone?: string; email?: string; password: string }): Promise<AuthUser> {
  const { data } = await api.post('/auth/web/login', credentials)
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  if (data.user) localStorage.setItem('auth_user', JSON.stringify(data.user))
  return data.user
}

export function logout(): void {
  const refreshToken = localStorage.getItem('refresh_token')
  if (refreshToken) {
    api.post('/auth/logout', { refresh_token: refreshToken }).catch(() => {})
  }
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('auth_user')
}

export function getStoredUser(): AuthUser | null {
  const token = localStorage.getItem('access_token')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const stored = localStorage.getItem('auth_user')
    const profile: Partial<AuthUser> = stored ? JSON.parse(stored) : {}
    return {
      id: payload.userId,
      role: payload.role,
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
    }
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('access_token')
}
